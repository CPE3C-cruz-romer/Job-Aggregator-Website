from django.db import migrations, models

import jobs.models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0006_alter_resume_file_alter_resume_image'),
    ]

    operations = [
        migrations.AlterField(
            model_name='resume',
            name='image',
            field=models.ImageField(blank=True, upload_to=jobs.models._resume_image_upload_path),
        ),
    ]
