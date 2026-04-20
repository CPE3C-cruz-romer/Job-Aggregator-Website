from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.decorators import login_required
from django.core.management import call_command
from django.conf import settings
from django.db import OperationalError, ProgrammingError
from django.db import connection
from django.db.models import Q
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from urllib.parse import urlencode
from urllib.parse import quote_plus
import secrets
from django.contrib.auth.models import User
import json
import re

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .forms import EmployerJobForm, EmployerRegistrationForm
from .models import EmployerJob, EmployerProfile, Job, UserProfile, SavedJob
from .serializers import JobSerializer
from .ai import match_skills, extract_skills_from_resume, analyze_resume_against_job

from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth import logout
from django.views.decorators.csrf import ensure_csrf_cookie

API_APP_ID = getattr(settings, "API_APP_ID", "aba5a62a")
API_APP_KEY = getattr(settings, "API_APP_KEY", "75f0ba2c5c175d657c947ab1e219a92b")
JOB_SOURCE_API_URL = getattr(settings, "JOB_SOURCE_API_URL", "")
ADZUNA_API_URL = "https://api.adzuna.com/v1/api/jobs"
ADZUNA_APP_ID = getattr(settings, "ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = getattr(settings, "ADZUNA_APP_KEY", "")
ADZUNA_COUNTRY = getattr(settings, "ADZUNA_COUNTRY", "us")
ADZUNA_MAX_PAGES = max(1, int(getattr(settings, "ADZUNA_MAX_PAGES", 3)))
GOOGLE_OAUTH_ENABLED = getattr(settings, "GOOGLE_OAUTH_ENABLED", False)
GOOGLE_OAUTH_CLIENT_ID = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
GOOGLE_OAUTH_CLIENT_SECRET = getattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "")
GOOGLE_OAUTH_REDIRECT_URI = getattr(
    settings,
    "GOOGLE_OAUTH_REDIRECT_URI",
    "http://localhost:8000/auth/google/callback/",
)


def _is_api_authenticated(request):
    app_id = request.headers.get("X-Application-Id", "")
    app_key = request.headers.get("X-Application-Key", "")
    return app_id == API_APP_ID and app_key == API_APP_KEY


SKILL_KEYWORDS = [
    "python", "django", "flask", "fastapi", "java", "javascript", "typescript",
    "react", "vue", "angular", "node", "nodejs", "php", "laravel", "c#", ".net",
    "golang", "go", "ruby", "rails", "sql", "postgresql", "mysql", "mongodb",
    "redis", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "bash",
    "git", "ci/cd", "graphql", "rest", "html", "css", "tailwind", "bootstrap",
    "machine learning", "ai", "nlp", "data analysis", "pandas", "numpy", "spark",
]
LEGACY_SAMPLE_JOB_TITLES = {
    "Junior Web Developer",
    "Systems Administrator",
    "UI Designer",
    "Network Engineer",
}


def _get_jobs():
    _sync_jobs_from_source()
    _remove_legacy_sample_jobs()
    return Job.objects.all().order_by("-is_direct_employer", "-is_priority", "-id")


def _remove_legacy_sample_jobs():
    Job.objects.filter(title__in=LEGACY_SAMPLE_JOB_TITLES).delete()


def _infer_skills_from_text(*texts):
    blob = " ".join(str(text or "").lower() for text in texts)
    compact = re.sub(r"\s+", " ", blob)
    found = [skill for skill in SKILL_KEYWORDS if skill in compact]
    return ",".join(dict.fromkeys(found))


def _normalize_api_jobs(payload):
    if isinstance(payload, dict):
        jobs = payload.get("jobs")
        if isinstance(jobs, list):
            payload = jobs
        else:
            payload = [payload]
    if not isinstance(payload, list):
        return []

    normalized = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or item.get("job_title") or "").strip()
        company = str(item.get("company") or item.get("company_name") or "Unknown Company").strip()
        if not title:
            continue
        skills = item.get("skills_required") or item.get("skills") or item.get("tags") or ""
        if isinstance(skills, list):
            skills = ",".join(str(skill).strip() for skill in skills if str(skill).strip())
        normalized.append({
            "title": title,
            "company": company,
            "description": str(item.get("description") or item.get("summary") or "").strip(),
            "skills_required": str(skills or "").strip(),
            "location": str(item.get("location") or "Remote").strip(),
            "apply_instructions": str(
                item.get("apply_instructions")
                or item.get("instructions")
                or item.get("how_to_apply")
                or ""
            ).strip(),
            "apply_url": str(
                item.get("apply_url")
                or item.get("application_url")
                or item.get("url")
                or ""
            ).strip(),
        })
    return normalized


def _sync_jobs_from_source(force=False):
    if not force and Job.objects.exists():
        return False

    if JOB_SOURCE_API_URL:
        return _sync_jobs_from_custom_source(force=force)
    return _sync_jobs_from_adzuna(force=force)


def _sync_jobs_from_custom_source(force=False):
    if not JOB_SOURCE_API_URL:
        return False
    if not force and Job.objects.exists():
        return False

    headers = {"Accept": "application/json"}
    source_key = getattr(settings, "JOB_SOURCE_API_KEY", "")
    if source_key:
        headers["Authorization"] = f"Bearer {source_key}"

    req = Request(JOB_SOURCE_API_URL, headers=headers, method="GET")
    try:
        with urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode("utf-8"))
    except (URLError, HTTPError, TimeoutError, json.JSONDecodeError):
        return False

    normalized_jobs = _normalize_api_jobs(data)
    if not normalized_jobs:
        return False
    _upsert_jobs(normalized_jobs)
    return True


def _sync_jobs_from_adzuna(force=False):
    if not force and Job.objects.exists():
        return False

    adzuna_app_id = ADZUNA_APP_ID
    adzuna_app_key = ADZUNA_APP_KEY
    if not adzuna_app_id or not adzuna_app_key:
        return False

    query = quote_plus("developer")
    country = str(ADZUNA_COUNTRY or "us").strip().lower() or "us"
    adzuna_results = []
    for page in range(1, ADZUNA_MAX_PAGES + 1):
        adzuna_url = (
            f"{ADZUNA_API_URL}/{country}/search/{page}"
            f"?app_id={adzuna_app_id}&app_key={adzuna_app_key}"
            f"&results_per_page=30&what={query}"
        )
        req = Request(adzuna_url, headers={"Accept": "application/json"}, method="GET")
        try:
            with urlopen(req, timeout=15) as res:
                payload = json.loads(res.read().decode("utf-8"))
        except (URLError, HTTPError, TimeoutError, json.JSONDecodeError):
            continue

        page_results = payload.get("results", []) if isinstance(payload, dict) else []
        if not isinstance(page_results, list) or not page_results:
            continue
        adzuna_results.extend(page_results)

    if not adzuna_results:
        return False

    normalized_jobs = []
    seen = set()
    for item in adzuna_results:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        company = str((item.get("company") or {}).get("display_name") or "Unknown Company").strip()
        location = str((item.get("location") or {}).get("display_name") or "Remote").strip()
        apply_url = str(item.get("redirect_url") or "").strip()
        unique_key = (title.lower(), company.lower(), location.lower(), apply_url.lower())
        if unique_key in seen:
            continue
        seen.add(unique_key)
        normalized_jobs.append({
            "title": title,
            "company": company,
            "description": str(item.get("description") or "").strip(),
            "skills_required": _infer_skills_from_text(title, item.get("description")),
            "location": location,
            "apply_instructions": "Apply using the link below.",
            "apply_url": apply_url,
        })

    if not normalized_jobs:
        return False
    _upsert_jobs(normalized_jobs)
    return True


def _upsert_jobs(normalized_jobs):
    for job_data in normalized_jobs:
        job, _created = Job.objects.get_or_create(
            title=job_data["title"],
            company=job_data["company"],
            location=job_data["location"],
            defaults=job_data,
        )
        for field, value in job_data.items():
            setattr(job, field, value)
        if not job_data.get("is_direct_employer") and not job.is_direct_employer:
            job.is_direct_employer = False
            job.is_priority = False
            job.employer = None
        job.save()


def user_logout(request):
    logout(request)
    return redirect('/')


def user_login(request):
    oauth_error = request.GET.get('google_error', '').strip()
    error_map = {
        'missing-config': 'Google login is not configured yet. Please set Google OAuth credentials.',
        'oauth-cancelled': 'Google login was cancelled.',
        'token-failed': 'Google login failed while retrieving access token.',
        'profile-failed': 'Google login failed while reading account details.',
        'no-email': 'Google account has no email available for sign in.',
    }

    if request.method == "POST":
        username = request.POST.get('username')
        password = request.POST.get('password')
        next_url = request.POST.get('next', '/dashboard/')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            auth_login(request, user)
            return redirect(next_url)
        else:
            return render(request, 'registration/login.html', {
                'error': 'Invalid username or password',
                'google_oauth_enabled': GOOGLE_OAUTH_ENABLED,
            })

    return render(request, 'registration/login.html', {
        'error': error_map.get(oauth_error, ''),
        'google_oauth_enabled': GOOGLE_OAUTH_ENABLED,
    })


def google_login_start(request):
    if not GOOGLE_OAUTH_ENABLED:
        return redirect('/login/?google_error=missing-config')
    next_url = request.GET.get("next", "/dashboard/").strip() or "/dashboard/"
    if not next_url.startswith("/"):
        next_url = "/dashboard/"
    oauth_state_token = secrets.token_urlsafe(16)
    oauth_state = f"{oauth_state_token}:{next_url}"
    request.session["google_oauth_next"] = next_url
    request.session["google_oauth_state_token"] = oauth_state_token
    auth_params = {
        "client_id": GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": GOOGLE_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "include_granted_scopes": "true",
        "prompt": "select_account",
        "state": oauth_state,
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(auth_params)}"
    return redirect(auth_url)


def google_login_callback(request):
    if not GOOGLE_OAUTH_ENABLED:
        return redirect('/login/?google_error=missing-config')

    state_value = request.GET.get("state", "").strip()
    state_next_url = ""
    if ":" in state_value:
        state_token, state_path = state_value.split(":", 1)
        if state_token and state_token == request.session.get("google_oauth_state_token"):
            state_next_url = state_path.strip()
    if state_next_url and not state_next_url.startswith("/"):
        state_next_url = ""

    code = request.GET.get('code', '').strip()
    if not code:
        return redirect('/login/?google_error=oauth-cancelled')

    token_payload = urlencode({
        "code": code,
        "client_id": GOOGLE_OAUTH_CLIENT_ID,
        "client_secret": GOOGLE_OAUTH_CLIENT_SECRET,
        "redirect_uri": GOOGLE_OAUTH_REDIRECT_URI,
        "grant_type": "authorization_code",
    }).encode("utf-8")

    token_req = Request(
        "https://oauth2.googleapis.com/token",
        data=token_payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urlopen(token_req, timeout=15) as token_res:
            token_data = json.loads(token_res.read().decode("utf-8"))
    except (URLError, HTTPError, TimeoutError, json.JSONDecodeError):
        return redirect('/login/?google_error=token-failed')

    id_token = token_data.get("id_token", "")
    if not id_token:
        return redirect('/login/?google_error=token-failed')

    verify_req = Request(
        f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}",
        headers={"Accept": "application/json"},
        method="GET",
    )
    try:
        with urlopen(verify_req, timeout=15) as verify_res:
            profile = json.loads(verify_res.read().decode("utf-8"))
    except (URLError, HTTPError, TimeoutError, json.JSONDecodeError):
        return redirect('/login/?google_error=profile-failed')

    email = str(profile.get("email", "")).strip().lower()
    if not email:
        return redirect('/login/?google_error=no-email')

    username = email
    if User.objects.filter(username=username).exists():
        user = User.objects.get(username=username)
    else:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=secrets.token_urlsafe(32),
        )

    auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    next_url = request.session.pop("google_oauth_next", state_next_url or "/dashboard/")
    request.session.pop("google_oauth_state_token", None)
    if not str(next_url).startswith("/"):
        next_url = "/dashboard/"
    return redirect(next_url)


def _ensure_employer_profile(user):
    defaults = {
        "company_name": user.email.split("@")[0].strip().title() if user.email else user.username,
    }
    profile, _created = EmployerProfile.objects.get_or_create(user=user, defaults=defaults)
    return profile


def _ensure_employer_tables_ready():
    required_tables = {
        EmployerProfile._meta.db_table,
        EmployerJob._meta.db_table,
    }
    existing_tables = set(connection.introspection.table_names())
    if required_tables.issubset(existing_tables):
        return True

    try:
        call_command("migrate", interactive=False, run_syncdb=True, verbosity=0)
    except Exception:
        return False

    existing_tables = set(connection.introspection.table_names())
    return required_tables.issubset(existing_tables)

# 🔹 HOME PAGE
def home_page(request):
    return render(request, 'jobs/home.html')


def about_page(request):
    return render(request, 'jobs/about.html')


def employer_home(request):
    if not _ensure_employer_tables_ready():
        return render(request, "jobs/employer_home.html", {
            "google_oauth_enabled": GOOGLE_OAUTH_ENABLED,
            "recent_jobs": [],
            "employer_count": 0,
            "listing_count": 0,
        })
    recent_jobs = EmployerJob.objects.select_related("employer").all()[:6]
    employer_count = EmployerProfile.objects.count()
    listing_count = EmployerJob.objects.count()
    return render(request, "jobs/employer_home.html", {
        "google_oauth_enabled": GOOGLE_OAUTH_ENABLED,
        "recent_jobs": recent_jobs,
        "employer_count": employer_count,
        "listing_count": listing_count,
    })


# 🔹 REGISTER
def register(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('/login/')   # 🔥 FIXED HERE
    else:
        form = UserCreationForm()

    return render(request, 'jobs/register.html', {
        'form': form,
        'google_oauth_enabled': GOOGLE_OAUTH_ENABLED,
    })


def employer_register(request):
    error = ""
    setup_error = request.GET.get("error", "").strip()
    if setup_error == "employer-db-missing":
        error = "Employer database tables are not ready yet. Please run migrations, then try again."
    if not _ensure_employer_tables_ready():
        return render(request, 'jobs/employer_register.html', {
            'form': EmployerRegistrationForm(request.POST or None),
            'google_oauth_enabled': GOOGLE_OAUTH_ENABLED,
            'error': "Employer database tables are not ready yet. Please run migrations, then try again.",
        })

    if request.method == "POST":
        form = EmployerRegistrationForm(request.POST)
        if form.is_valid():
            user = User.objects.create_user(
                username=form.cleaned_data["username"],
                email=form.cleaned_data["email"],
                password=form.cleaned_data["password1"],
            )
            try:
                EmployerProfile.objects.create(
                    user=user,
                    company_name=form.cleaned_data["company_name"],
                )
            except (OperationalError, ProgrammingError):
                user.delete()
                return redirect("/employers/register/?error=employer-db-missing")
            auth_login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            return redirect('/employers/dashboard/')
    else:
        form = EmployerRegistrationForm()

    return render(request, 'jobs/employer_register.html', {
        'form': form,
        'google_oauth_enabled': GOOGLE_OAUTH_ENABLED,
        'error': error,
    })


def employer_login(request):
    error = ""
    setup_error = request.GET.get("error", "").strip()
    if setup_error == "employer-db-missing":
        error = "Employer database tables are not ready yet. Please run migrations, then try again."
    if not _ensure_employer_tables_ready():
        return render(request, "jobs/employer_login.html", {
            "error": "Employer database tables are not ready yet. Please run migrations, then try again.",
            "google_oauth_enabled": GOOGLE_OAUTH_ENABLED,
        })

    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        password = request.POST.get("password", "").strip()
        user = authenticate(request, username=username, password=password)
        if user is None:
            error = "Invalid username or password."
        else:
            try:
                _ensure_employer_profile(user)
            except (OperationalError, ProgrammingError):
                return redirect("/employers/login/?error=employer-db-missing")
            auth_login(request, user)
            return redirect("/employers/dashboard/")

    return render(request, "jobs/employer_login.html", {
        "error": error,
        "google_oauth_enabled": GOOGLE_OAUTH_ENABLED,
    })


@login_required
def employer_dashboard(request):
    if not _ensure_employer_tables_ready():
        return redirect("/employers/login/?error=employer-db-missing")
    try:
        profile = _ensure_employer_profile(request.user)
    except (OperationalError, ProgrammingError):
        return redirect("/employers/login/?error=employer-db-missing")
    if request.method == "POST":
        form = EmployerJobForm(request.POST)
        if form.is_valid():
            employer_job = form.save(commit=False)
            employer_job.employer = profile
            employer_job.is_priority = True
            employer_job.save()
            Job.objects.create(
                title=employer_job.title,
                company=profile.company_name,
                description=employer_job.description,
                skills_required=employer_job.requirements,
                location=employer_job.location,
                apply_instructions=(
                    f"Direct employer contact: {employer_job.contact_email} | "
                    f"{employer_job.contact_number}. {employer_job.work_details}"
                ),
                apply_url="",
                is_direct_employer=True,
                is_priority=True,
                employer=profile,
            )
            return redirect("/employers/dashboard/")
    else:
        form = EmployerJobForm()

    jobs = EmployerJob.objects.filter(employer=profile)
    return render(request, "jobs/employer_dashboard.html", {
        "form": form,
        "jobs": jobs,
        "profile": profile,
    })


@login_required
def delete_employer_job(request, job_id):
    if request.method != "POST":
        return redirect("/employers/dashboard/")
    if not _ensure_employer_tables_ready():
        return redirect("/employers/login/?error=employer-db-missing")
    try:
        profile = _ensure_employer_profile(request.user)
    except (OperationalError, ProgrammingError):
        return redirect("/employers/login/?error=employer-db-missing")

    try:
        employer_job = EmployerJob.objects.get(id=job_id, employer=profile)
    except EmployerJob.DoesNotExist:
        return redirect("/employers/dashboard/")

    Job.objects.filter(
        employer=profile,
        is_direct_employer=True,
        title=employer_job.title,
        location=employer_job.location,
        description=employer_job.description,
    ).delete()
    employer_job.delete()
    return redirect("/employers/dashboard/")


# 🔹 DASHBOARD (PROTECTED)
@login_required
@ensure_csrf_cookie
def match_page(request):
    return render(request, 'jobs/match.html')


# 🔹 API: JOB LIST
@api_view(['GET'])
def job_list(request):
    if not _is_api_authenticated(request):
        return Response({"detail": "Invalid API credentials."}, status=401)
    refresh = request.GET.get("refresh", "").strip() == "1"
    if refresh:
        _sync_jobs_from_source(force=True)
    jobs = _get_jobs()
    query = request.GET.get("q", "").strip()
    if query:
        jobs = jobs.filter(
            Q(title__icontains=query) |
            Q(company__icontains=query) |
            Q(location__icontains=query) |
            Q(skills_required__icontains=query)
        )
    serializer = JobSerializer(jobs, many=True)
    return Response(serializer.data)


# 🔹 API: MATCH USER INPUT SKILLS
@api_view(['GET'])
def match_user_skills(request):
    if not _is_api_authenticated(request):
        return Response({"detail": "Invalid API credentials."}, status=401)
    user_skills = request.GET.get('skills', '')

    jobs = _get_jobs()
    results = []

    for job in jobs:
        match = match_skills(user_skills, job.skills_required)

        results.append({
            "job": job.title,
            "company": job.company,
            "match": match
        })

    return Response(results)


@api_view(['GET'])
def match_resume_skills(request):
    if not _is_api_authenticated(request):
        return Response({"detail": "Invalid API credentials."}, status=401)
    resume_text = request.GET.get('resume_text', '')
    job_description = request.GET.get('job_description', '')
    jobs = _get_jobs()
    skill_vocabulary = set()

    for job in jobs:
        for skill in (job.skills_required or '').split(','):
            cleaned = skill.strip().lower()
            if cleaned:
                skill_vocabulary.add(cleaned)

    extracted_skills = extract_skills_from_resume(resume_text, skill_vocabulary)
    skill_text = ",".join(extracted_skills)

    if job_description:
        analysis = analyze_resume_against_job(
            resume_text=resume_text,
            job_description=job_description,
            skill_vocabulary=skill_vocabulary,
        )
        return Response(analysis)

    results = []
    for job in jobs:
        match = match_skills(skill_text, job.skills_required)
        results.append({
            "job": job.title,
            "company": job.company,
            "match": match
        })

    return Response({
        "extracted_skills": extracted_skills,
        "results": results
    })


@api_view(['GET'])
def job_detail(request, job_id):
    if not _is_api_authenticated(request):
        return Response({"detail": "Invalid API credentials."}, status=401)
    _get_jobs()
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response({"detail": "Job not found."}, status=404)

    is_saved = SavedJob.objects.filter(user_name=request.user.username, job=job).exists() if request.user.is_authenticated else False
    return Response({
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "location": job.location,
        "description": job.description,
        "skills_required": job.skills_required,
        "apply_instructions": job.apply_instructions,
        "apply_url": job.apply_url,
        "is_saved": is_saved
    })


@api_view(['GET', 'POST'])
def toggle_save_job(request, job_id):
    if not _is_api_authenticated(request):
        return Response({"detail": "Invalid API credentials."}, status=401)
    if not request.user.is_authenticated:
        return Response({"detail": "Login required."}, status=401)
    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        return Response({"detail": "Job not found."}, status=404)

    saved = SavedJob.objects.filter(user_name=request.user.username, job=job)
    if saved.exists():
        saved.delete()
        return Response({"saved": False, "message": "Job removed from saved list."})

    SavedJob.objects.create(user_name=request.user.username, job=job)
    return Response({"saved": True, "message": "Job saved successfully."})


@api_view(['GET'])
def saved_jobs(request):
    if not _is_api_authenticated(request):
        return Response({"detail": "Invalid API credentials."}, status=401)
    if not request.user.is_authenticated:
        return Response({"detail": "Login required."}, status=401)

    rows = SavedJob.objects.filter(user_name=request.user.username).select_related("job").order_by("-id")
    return Response([
        {
            "id": row.job.id,
            "title": row.job.title,
            "company": row.job.company,
            "location": row.job.location,
        }
        for row in rows
    ])


@api_view(['POST'])
def refresh_jobs(request):
    if not _is_api_authenticated(request):
        return Response({"detail": "Invalid API credentials."}, status=401)
    synced = _sync_jobs_from_source(force=True)
    _remove_legacy_sample_jobs()
    return Response({
        "synced": synced,
        "count": Job.objects.count(),
    })


# 🔹 API: MATCH SAVED USER PROFILE
@api_view(['GET'])
def job_with_match(request, user_id):
    user = UserProfile.objects.get(id=user_id)
    jobs = Job.objects.all()

    results = []

    for job in jobs:
        match = match_skills(user.skills, job.skills_required)

        results.append({
            "job": job.title,
            "company": job.company,
            "match": match
        })

    return Response(results)
