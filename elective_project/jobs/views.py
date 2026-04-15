from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.decorators import login_required

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Job, UserProfile
from .serializers import JobSerializer
from .ai import match_skills

from django.contrib.auth import authenticate, login as auth_login
from django.contrib.auth import logout


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
    jobs = Job.objects.all()
    serializer = JobSerializer(jobs, many=True)
    return Response(serializer.data)


# 🔹 API: MATCH USER INPUT SKILLS
@api_view(['GET'])
def match_user_skills(request):
    user_skills = request.GET.get('skills', '')

    jobs = Job.objects.all()
    results = []

    for job in jobs:
        match = match_skills(user_skills, job.skills_required)

        results.append({
            "job": job.title,
            "company": job.company,
            "match": match
        })

    return Response(results)


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