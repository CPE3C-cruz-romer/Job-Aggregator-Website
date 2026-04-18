from django.urls import path
from .views import job_list, job_detail, toggle_save_job, job_with_match, match_user_skills, match_resume_skills, refresh_jobs, home_page, about_page
from .views import register, user_login, user_logout, google_login_start, google_login_callback

urlpatterns = [
    path('jobs/', job_list),
    path('jobs/<int:job_id>/', job_detail),
    path('jobs/<int:job_id>/save/', toggle_save_job),
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
]
