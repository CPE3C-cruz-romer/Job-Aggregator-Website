from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    register_view,
    employer_register_view,
    login_view,
    employer_login_view,
    google_login_view,
    JobViewSet,
    EmployerProfileViewSet,
    EmployerJobViewSet,
    SavedJobViewSet,
    ApplicationViewSet,
    ResumeViewSet,
)

router = DefaultRouter()
router.register(r'jobs', JobViewSet, basename='jobs')
router.register(r'employer/profile', EmployerProfileViewSet, basename='employer-profile')
router.register(r'employer/jobs', EmployerJobViewSet, basename='employer-jobs')
router.register(r'save-job', SavedJobViewSet, basename='save-job')
router.register(r'apply', ApplicationViewSet, basename='apply')
router.register(r'resume', ResumeViewSet, basename='resume')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/register/', register_view, name='register'),
    path('auth/employer/register/', employer_register_view, name='employer-register'),
    path('employer/register/', employer_register_view, name='employer-register-alias'),
    path('auth/login/', login_view, name='login'),
    path('auth/employer/login/', employer_login_view, name='employer-login'),
    path('employer/login/', employer_login_view, name='employer-login-alias'),
    path('auth/google/', google_login_view, name='google-login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
