from django.urls import path
from .views import job_list, job_with_match, match_user_skills, home_page
from .views import register, user_login, user_logout

urlpatterns = [
    path('jobs/', job_list),
    path('match/<int:user_id>/', job_with_match),
    path('match-user/', match_user_skills),

    path('', home_page, name='home'),  # ✅ ADD name
    path('register/', register, name='register'),  # ✅ ADD name
    path('login/', user_login, name='login'),  # ✅ ADD name (IMPORTANT)
    path('logout/', user_logout, name='logout'),  # ✅ ADD name
]