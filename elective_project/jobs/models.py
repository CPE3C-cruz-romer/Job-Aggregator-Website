from django.contrib.auth.models import User
from django.db import models

class Job(models.Model):
    title = models.CharField(max_length=200)
    company = models.CharField(max_length=200)
    description = models.TextField()
    skills_required = models.TextField()
    location = models.CharField(max_length=100)
    apply_instructions = models.TextField(blank=True, default="")
    apply_url = models.URLField(blank=True, default="")
    is_direct_employer = models.BooleanField(default=False)
    is_priority = models.BooleanField(default=False)
    employer = models.ForeignKey(
        "EmployerProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="published_jobs",
    )

    def __str__(self):
        return self.title


class SavedJob(models.Model):
    user_name = models.CharField(max_length=100)
    job = models.ForeignKey(Job, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.user_name} saved {self.job.title}"


class Application(models.Model):
    user_name = models.CharField(max_length=100)
    job = models.ForeignKey(Job, on_delete=models.CASCADE)
    status = models.CharField(max_length=50, default="applied")

    def __str__(self):
        return f"{self.user_name} applied to {self.job.title}"
class UserProfile(models.Model):
    name = models.CharField(max_length=100)
    skills = models.TextField()  # e.g. "python, django, sql"

    def __str__(self):
        return self.name


class EmployerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="employer_profile")
    company_name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.company_name


class EmployerJob(models.Model):
    employer = models.ForeignKey(EmployerProfile, on_delete=models.CASCADE, related_name="jobs")
    title = models.CharField(max_length=200)
    description = models.TextField()
    location = models.CharField(max_length=100)
    contact_number = models.CharField(max_length=50)
    contact_email = models.EmailField()
    work_details = models.TextField()
    requirements = models.TextField()
    is_priority = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_priority", "-created_at"]

    def __str__(self):
        return f"{self.title} ({self.employer.company_name})"
