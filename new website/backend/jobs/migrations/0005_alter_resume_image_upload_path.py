from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0004_userprofile_profile_picture'),
    ]

    operations = [
        migrations.AlterField(
            model_name='resume',
            name='image',
            field=models.ImageField(blank=True, upload_to='camera/resume-images/'),
        ),
    ]
