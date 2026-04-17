from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.db.models import Q
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import json

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Job, UserProfile, SavedJob
from .serializers import JobSerializer
from .ai import match_skills, extract_skills_from_resume

from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth import logout

API_APP_ID = getattr(settings, "API_APP_ID", "aba5a62a")
API_APP_KEY = getattr(settings, "API_APP_KEY", "75f0ba2c5c175d657c947ab1e219a92b")
JOB_SOURCE_API_URL = getattr(settings, "JOB_SOURCE_API_URL", "")


def _is_api_authenticated(request):
    app_id = request.headers.get("X-Application-Id", "")
    app_key = request.headers.get("X-Application-Key", "")
    return app_id == API_APP_ID and app_key == API_APP_KEY


def _get_jobs():
    _sync_jobs_from_source()
    jobs = Job.objects.all()
    if jobs.exists():
        return jobs
    _seed_jobs()
    return Job.objects.all()


def _seed_jobs():
    seed_jobs = [
        {
            "title": "Junior Web Developer",
            "company": "Nexus Tech",
            "description": "Build and maintain Django web applications.",
            "skills_required": "python,django,html,css,javascript",
            "location": "Manila, PH",
            "apply_instructions": "Send your updated CV and portfolio to HR.",
            "apply_url": "",
        },
        {
            "title": "Systems Administrator",
            "company": "CloudScale",
            "description": "Manage Linux servers and deployment pipelines.",
            "skills_required": "linux,bash,docker,networking",
            "location": "Remote",
            "apply_instructions": "Attach certification list and recent project experience.",
            "apply_url": "",
        },
        {
            "title": "UI Designer",
            "company": "Creative Hub",
            "description": "Design modern and accessible user interfaces.",
            "skills_required": "figma,ui design,ux,prototyping",
            "location": "Bulacan, PH",
            "apply_instructions": "Include Figma links and design case study.",
            "apply_url": "",
        },
        {
            "title": "Network Engineer",
            "company": "DataLink",
            "description": "Maintain network infrastructure and security.",
            "skills_required": "networking,security,cisco,troubleshooting",
            "location": "Quezon City",
            "apply_instructions": "Submit resume plus network troubleshooting experience summary.",
            "apply_url": "",
        },
    ]
    Job.objects.bulk_create([Job(**item) for item in seed_jobs])


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

    for job_data in normalized_jobs:
        job, _created = Job.objects.get_or_create(
            title=job_data["title"],
            company=job_data["company"],
            location=job_data["location"],
            defaults=job_data,
        )
        for field, value in job_data.items():
            setattr(job, field, value)
        job.save()
    return True


def user_logout(request):
    logout(request)
    return redirect('/')


def user_login(request):
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
                'error': 'Invalid username or password'
            })

    return render(request, 'registration/login.html')

# 🔹 HOME PAGE
def home_page(request):
    return render(request, 'jobs/home.html')


def about_page(request):
    return render(request, 'jobs/about.html')


# 🔹 REGISTER
def register(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('/login/')   # 🔥 FIXED HERE
    else:
        form = UserCreationForm()

    return render(request, 'jobs/register.html', {'form': form})


# 🔹 DASHBOARD (PROTECTED)
@login_required
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
    jobs = _get_jobs()
    skill_vocabulary = set()

    for job in jobs:
        for skill in (job.skills_required or '').split(','):
            cleaned = skill.strip().lower()
            if cleaned:
                skill_vocabulary.add(cleaned)

    extracted_skills = extract_skills_from_resume(resume_text, skill_vocabulary)
    skill_text = ",".join(extracted_skills)

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


@api_view(['POST'])
def refresh_jobs(request):
    if not _is_api_authenticated(request):
        return Response({"detail": "Invalid API credentials."}, status=401)
    synced = _sync_jobs_from_source(force=True)
    if not synced and not Job.objects.exists():
        _seed_jobs()
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
