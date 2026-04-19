from django.contrib import admin
from .models import Application, EmployerJob, EmployerProfile, Job, SavedJob

admin.site.register(Job)
admin.site.register(SavedJob)
admin.site.register(Application)
admin.site.register(EmployerProfile)
admin.site.register(EmployerJob)
