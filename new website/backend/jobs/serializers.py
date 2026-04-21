from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from .models import EmployerProfile, Job, SavedJob, Application, Resume


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', '') or '',
            password=validated_data['password'],
        )
        return user


class EmployerRegisterSerializer(UserRegisterSerializer):
    company_name = serializers.CharField(max_length=255)
    contact_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=50, allow_blank=True, required=False)

    class Meta(UserRegisterSerializer.Meta):
        fields = UserRegisterSerializer.Meta.fields + ('company_name', 'contact_email', 'contact_phone')

    def create(self, validated_data):
        company_name = validated_data.pop('company_name')
        contact_email = validated_data.pop('contact_email')
        contact_phone = validated_data.pop('contact_phone', '')
        with transaction.atomic():
            user = super().create(validated_data)
            EmployerProfile.objects.create(
                user=user,
                company_name=company_name,
                contact_email=contact_email,
                contact_phone=contact_phone,
            )
        return user


class EmployerProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = EmployerProfile
        fields = ('id', 'username', 'company_name', 'contact_email', 'contact_phone', 'website', 'about', 'created_at')


class JobSerializer(serializers.ModelSerializer):
    posted_by_company = serializers.CharField(source='posted_by_employer.company_name', read_only=True)

    class Meta:
        model = Job
        fields = '__all__'


class SavedJobSerializer(serializers.ModelSerializer):
    job = JobSerializer(read_only=True)
    job_id = serializers.PrimaryKeyRelatedField(source='job', queryset=Job.objects.all(), write_only=True)

    class Meta:
        model = SavedJob
        fields = ('id', 'job', 'job_id', 'created_at')


class ApplicationSerializer(serializers.ModelSerializer):
    job = JobSerializer(read_only=True)
    job_id = serializers.PrimaryKeyRelatedField(source='job', queryset=Job.objects.all(), write_only=True)

    class Meta:
        model = Application
        fields = ('id', 'job', 'job_id', 'status', 'notes', 'created_at', 'updated_at')


class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ('id', 'file', 'image', 'extracted_text', 'uploaded_at')
        read_only_fields = ('extracted_text', 'uploaded_at')
