from django.core.management.base import BaseCommand
from django.db.models import Q

from jobs.models import Job


class Command(BaseCommand):
    help = "Remove practice/sample/dummy jobs so listings contain only real ingested or employer-posted jobs."

    def handle(self, *args, **options):
        queryset = Job.objects.filter(
            Q(source__in=['local-fallback', 'dummy', 'sample', 'practice', 'test'])
            | Q(url__icontains='example.com/jobs')
            | Q(title__iregex=r'^\s*(practice|dummy|sample|test)\b')
            | Q(title__icontains='practice job')
            | Q(title__icontains='dummy job')
            | Q(title__icontains='sample job')
            | Q(title__icontains='test job')
        )
        deleted_count = queryset.count()
        queryset.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} invalid jobs."))
