from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from jobs import views

urlpatterns = [
    path('', views.home_page, name='home'),

    path('dashboard/', views.match_page, name='dashboard'),

    path('', include('jobs.urls')),

    path('api/', include('jobs.urls')),

    # 🔥 FIX: redirect default Django login
    path('accounts/login/', lambda request: redirect('/login/')),

    path('admin/', admin.site.urls),
]