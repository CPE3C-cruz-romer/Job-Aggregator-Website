from django.conf import settings
from django.db import models


class EmployerProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='employer_profile')
    company_name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    about = models.TextField(blank=True)
    logo_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company_name} ({self.user.username})"


class Job(models.Model):
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    description = models.TextField()
    requirements = models.TextField(blank=True)
    category = models.CharField(max_length=120, blank=True)
    required_skills = models.JSONField(default=list, blank=True)
    salary = models.CharField(max_length=120, blank=True)
    url = models.URLField(unique=True, blank=True, null=True)
    source = models.CharField(max_length=50, default='adzuna')
    is_direct_employer = models.BooleanField(default=False)
    priority_score = models.IntegerField(default=0)
    posted_by_employer = models.ForeignKey(
        EmployerProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='posted_jobs',
    )
    contact_name = models.CharField(max_length=255, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-priority_score', '-created_at']

    def __str__(self):
        return f"{self.title} - {self.company}"


class SavedJob(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_jobs')
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='saved_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'job')
        ordering = ['-created_at']


class Application(models.Model):
    STATUS_CHOICES = [
        ('applied', 'Applied'),
        ('interviewing', 'Interviewing'),
        ('offered', 'Offered'),
        ('rejected', 'Rejected'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='applications')
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='applied')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'job')
        ordering = ['-updated_at']


class Resume(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='resume')
    file = models.FileField(upload_to='resumes/', blank=True)
    image = models.ImageField(upload_to='resume-images/', blank=True)
    extracted_text = models.TextField(blank=True)
    uploaded_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Resume({self.user.username})"


class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=255, blank=True)
    job_interests = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)
    experience = models.TextField(blank=True)
    profile_picture_url = models.URLField(blank=True)
    onboarding_completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"UserProfile({self.user.username})"
