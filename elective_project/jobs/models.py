from django.db import models

class Job(models.Model):
    title = models.CharField(max_length=200)
    company = models.CharField(max_length=200)
    description = models.TextField()
    skills_required = models.TextField()
    location = models.CharField(max_length=100)

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