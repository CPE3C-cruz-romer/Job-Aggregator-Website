from django.contrib import admin
from .models import EmployerProfile, Job, SavedJob, Application, Resume

admin.site.register(EmployerProfile)
admin.site.register(Job)
admin.site.register(SavedJob)
admin.site.register(Application)
admin.site.register(Resume)
