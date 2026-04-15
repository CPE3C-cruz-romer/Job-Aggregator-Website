from django.contrib import admin
from .models import Job, SavedJob, Application

admin.site.register(Job)
admin.site.register(SavedJob)
admin.site.register(Application)
