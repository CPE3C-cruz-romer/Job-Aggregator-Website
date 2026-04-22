from django.db import migrations, models

import jobs.models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0005_alter_resume_image_upload_path'),
    ]

    operations = [
        migrations.AlterField(
            model_name='resume',
            name='file',
            field=models.FileField(blank=True, upload_to=jobs.models._resume_file_upload_path),
        ),
        migrations.AlterField(
            model_name='resume',
            name='image',
            field=models.ImageField(blank=True, upload_to=jobs.models._resume_image_upload_path),
        ),
    ]
