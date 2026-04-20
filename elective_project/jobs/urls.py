from django.urls import path
from .views import (
    about_page,
    employer_dashboard,
    employer_home,
    delete_employer_job,
    employer_login,
    employer_register,
    google_login_callback,
    google_login_start,
    home_page,
    job_detail,
    job_list,
    job_with_match,
    match_resume_skills,
    match_user_skills,
    refresh_jobs,
    register,
    saved_jobs,
    toggle_save_job,
    user_login,
    user_logout,
)

urlpatterns = [
    path('jobs/', job_list),
    path('jobs/<int:job_id>/', job_detail),
    path('jobs/<int:job_id>/save/', toggle_save_job),
    path('jobs/saved/', saved_jobs),
    path('jobs/refresh/', refresh_jobs),
    path('match/<int:user_id>/', job_with_match),
    path('match-user/', match_user_skills),
    path('match-resume/', match_resume_skills),

    path('', home_page, name='home'),  # ✅ ADD name
    path('about/', about_page, name='about'),
    path('register/', register, name='register'),  # ✅ ADD name
    path('login/', user_login, name='login'),  # ✅ ADD name (IMPORTANT)
    path('auth/google/', google_login_start, name='google_login_start'),
    path('auth/google/callback/', google_login_callback, name='google_login_callback'),
    path('logout/', user_logout, name='logout'),  # ✅ ADD name
    path('employers/', employer_home, name='employer_home'),
    path('employers/register/', employer_register, name='employer_register'),
    path('employers/login/', employer_login, name='employer_login'),
    path('employers/dashboard/', employer_dashboard, name='employer_dashboard'),
    path('employers/jobs/<int:job_id>/delete/', delete_employer_job, name='delete_employer_job'),
]
