import re

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import IntegrityError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.exceptions import APIException
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import EmployerProfile, Job, SavedJob, Application, Resume
from .serializers import (
    UserRegisterSerializer,
    EmployerRegisterSerializer,
    EmployerProfileSerializer,
    JobSerializer,
    SavedJobSerializer,
    ApplicationSerializer,
    ResumeSerializer,
)
from .services import (
    fetch_jobs_from_adzuna,
    clean_extracted_text,
    extract_text_from_pdf,
    extract_text_from_image,
    match_resume_skills,
    recommend_jobs_for_skills,
)
from .db_ready import ensure_db_ready


def _token_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        'user': {'id': user.id, 'username': user.username, 'email': user.email},
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'is_employer': hasattr(user, 'employer_profile'),
    }


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def register_view(request):
    try:
        ensure_db_ready()
    except Exception as exc:
        return Response({'error': f'Database initialization failed: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(_token_response(user), status=status.HTTP_201_CREATED)
    except IntegrityError:
        return Response({'error': 'Username already exists.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def employer_register_view(request):
    try:
        ensure_db_ready()
    except Exception as exc:
        return Response({'error': f'Database initialization failed: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    serializer = EmployerRegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(_token_response(user), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login_view(request):
    try:
        ensure_db_ready()
    except Exception as exc:
        return Response({'error': f'Database initialization failed: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    identifier = (request.data.get('username') or '').strip()
    password = request.data.get('password') or ''

    if not identifier or not password:
        return Response({'error': 'Username/email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=identifier, password=password)

    # allow login via email as well
    if user is None and '@' in identifier:
        matched = User.objects.filter(email__iexact=identifier).first()
        if matched:
            user = authenticate(username=matched.username, password=password)

    if user is None:
        return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    return Response(_token_response(user))


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def employer_login_view(request):
    try:
        ensure_db_ready()
    except Exception as exc:
        return Response({'error': f'Database initialization failed: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    identifier = (request.data.get('username') or '').strip()
    password = request.data.get('password') or ''

    if not identifier or not password:
        return Response({'error': 'Username/email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=identifier, password=password)

    if user is None and '@' in identifier:
        matched = User.objects.filter(email__iexact=identifier).first()
        if matched:
            user = authenticate(username=matched.username, password=password)

    if user is None:
        return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not hasattr(user, 'employer_profile'):
        return Response({'error': 'This account is not registered as an employer.'}, status=status.HTTP_403_FORBIDDEN)

    return Response(_token_response(user))


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def google_login_view(request):
    try:
        ensure_db_ready()
    except Exception as exc:
        return Response({'error': f'Database initialization failed: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    token = request.data.get('credential')
    if not token:
        return Response({'error': 'Google credential is required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not settings.GOOGLE_CLIENT_ID:
        return Response(
            {'error': 'Google client ID is not configured on backend (.env GOOGLE_CLIENT_ID).'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if settings.GOOGLE_CLIENT_ID.startswith('GOCSPX-'):
        return Response(
            {'error': 'Backend GOOGLE_CLIENT_ID must be a Google OAuth Client ID, not a client secret.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        info = id_token.verify_oauth2_token(token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
    except Exception:
        return Response(
            {
                'error': (
                    'Google authentication failed. Make sure localhost/127.0.0.1 are added as '
                    'Authorized JavaScript origins in Google Cloud Console.'
                ),
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    email = info.get('email')
    if not email:
        return Response({'error': 'Google account email not provided.'}, status=status.HTTP_400_BAD_REQUEST)

    name = info.get('name') or email.split('@')[0]
    user = User.objects.filter(email__iexact=email).first()
    if not user:
        try:
            user, _ = User.objects.get_or_create(
                username=email,
                defaults={'email': email, 'first_name': name[:150]},
            )
        except IntegrityError:
            fallback_username = email.split('@')[0]
            user, _ = User.objects.get_or_create(
                username=fallback_username,
                defaults={'email': email, 'first_name': name[:150]},
            )
    elif not user.first_name:
        user.first_name = name[:150]
        user.save(update_fields=['first_name'])

    return Response(_token_response(user))


class JobViewSet(viewsets.ModelViewSet):
    queryset = Job.objects.select_related('posted_by_employer').all()
    serializer_class = JobSerializer
    authentication_classes = []
    permission_classes = [AllowAny]
    search_fields = ['title', 'location', 'company', 'description']

    def initial(self, request, *args, **kwargs):
        try:
            ensure_db_ready()
        except Exception as exc:
            raise APIException(f'Database initialization failed: {str(exc)}') from exc
        return super().initial(request, *args, **kwargs)

    @action(detail=False, methods=['post'], authentication_classes=[], permission_classes=[AllowAny])
    def refresh(self, request):
        try:
            ensure_db_ready()
        except Exception as exc:
            return Response({'error': f'Database initialization failed: {str(exc)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        query = request.data.get('query', 'software engineer')
        location = request.data.get('location', 'united states')
        results_per_page = int(request.data.get('results_per_page', 50))
        pages = int(request.data.get('pages', 3))
        result = fetch_jobs_from_adzuna(
            query=query,
            location=location,
            results_per_page=max(10, min(results_per_page, 50)),
            pages=max(1, min(pages, 5)),
        )

        if result['error']:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)


class EmployerProfileViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EmployerProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EmployerProfile.objects.filter(user=self.request.user)


class EmployerJobViewSet(viewsets.ModelViewSet):
    serializer_class = JobSerializer
    permission_classes = [IsAuthenticated]

    def initial(self, request, *args, **kwargs):
        try:
            ensure_db_ready()
        except Exception as exc:
            raise APIException(f'Database initialization failed: {str(exc)}') from exc
        return super().initial(request, *args, **kwargs)

    def get_queryset(self):
        if not hasattr(self.request.user, 'employer_profile'):
            return Job.objects.none()
        return Job.objects.filter(posted_by_employer=self.request.user.employer_profile)

    def create(self, request, *args, **kwargs):
        if not hasattr(request.user, 'employer_profile'):
            return Response({'detail': 'Employer account required.'}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data.copy()
        payload['company'] = str(payload.get('company', '')).strip()
        payload['source'] = 'employer'
        payload['priority_score'] = 100
        payload['posted_by_employer'] = request.user.employer_profile.id
        url_value = str(payload.get('url', '')).strip()
        payload['url'] = url_value or None
        if not payload.get('contact_email'):
            payload['contact_email'] = request.user.employer_profile.contact_email
        if not payload.get('contact_phone'):
            payload['contact_phone'] = request.user.employer_profile.contact_phone

        contact_email = str(payload.get('contact_email', '')).strip()
        contact_phone = re.sub(r'\D', '', str(payload.get('contact_phone', '')))
        payload['contact_phone'] = contact_phone

        required_fields = ['title', 'company', 'location', 'description']
        missing = [field for field in required_fields if not str(payload.get(field, '')).strip()]
        if missing:
            readable = ', '.join(field.replace('_', ' ') for field in missing)
            return Response(
                {'error': f'Please complete all required job details: {readable}. Application URL is optional.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if contact_email and '@' not in contact_email:
            return Response(
                {'error': 'Contact email must include @ (valid gmail/email format).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if contact_phone and not re.fullmatch(r'\d{10,15}', contact_phone):
            return Response(
                {'error': 'Contact phone must contain 10 to 15 digits.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SavedJobViewSet(viewsets.ModelViewSet):
    serializer_class = SavedJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedJob.objects.filter(user=self.request.user).select_related('job')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(user=self.request.user).select_related('job')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ResumeViewSet(viewsets.ModelViewSet):
    serializer_class = ResumeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Resume.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        resume, _ = Resume.objects.get_or_create(user=request.user)

        uploaded_file = request.FILES.get('file')
        uploaded_image = request.FILES.get('image')
        if not uploaded_file and not uploaded_image:
            return Response({'error': 'Upload a PDF or resume image first.'}, status=status.HTTP_400_BAD_REQUEST)
        if uploaded_file and not uploaded_file.name.lower().endswith('.pdf'):
            return Response({'error': 'Resume file must be a PDF.'}, status=status.HTTP_400_BAD_REQUEST)
        if uploaded_image:
            allowed_ext = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff')
            if not uploaded_image.name.lower().endswith(allowed_ext):
                return Response(
                    {'error': 'Resume image must be jpg, jpeg, png, webp, bmp, tif, or tiff.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = self.get_serializer(resume, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        resume = serializer.save()

        # Keep resume source in sync: a new PDF replaces old image, and vice versa.
        if uploaded_file and resume.image:
            resume.image.delete(save=False)
            resume.image = None
        if uploaded_image and resume.file:
            resume.file.delete(save=False)
            resume.file = None

        previous_text = resume.extracted_text or ''
        extracted_text = ''
        nickname = (request.data.get('nickname') or '').strip()
        if uploaded_file and resume.file and resume.file.name.lower().endswith('.pdf'):
            with resume.file.open('rb') as pdf_file:
                extracted_text = clean_extracted_text(extract_text_from_pdf(pdf_file))
        elif uploaded_image and resume.image:
            with resume.image.open('rb') as image_file:
                extracted_text = extract_text_from_image(image_file)

        if nickname:
            extracted_text = f"{extracted_text}\nnickname: {nickname}".strip()

        # If OCR is unavailable for an image upload, keep prior parsed text so skill matching still works.
        if uploaded_image and not extracted_text and previous_text:
            resume.extracted_text = previous_text
        else:
            resume.extracted_text = extracted_text
        resume.save(update_fields=['image', 'file', 'extracted_text'])

        response_data = self.get_serializer(resume).data
        if uploaded_image and not extracted_text:
            response_data['ocr_warning'] = (
                'Image uploaded, but OCR is not configured on the server yet. '
                'Install pytesseract + system tesseract for camera/image skill matching.'
            )

        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def recommendations(self, request):
        resume = Resume.objects.filter(user=request.user).first()
        if not resume:
            return Response({'error': 'No resume found. Upload a resume first.'}, status=status.HTTP_400_BAD_REQUEST)
        if not resume.extracted_text:
            return Response(
                {'error': 'Resume text could not be extracted. Upload a readable PDF to continue.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        jobs = Job.objects.all()
        if not jobs.exists():
            return Response({'error': 'No jobs available for matching yet.'}, status=status.HTTP_404_NOT_FOUND)

        recommendation_data = recommend_jobs_for_skills(resume.extracted_text, jobs)
        if not recommendation_data['extracted_skills']:
            return Response(
                {'error': 'No known skills found in your resume. Please upload a clearer resume.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(recommendation_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def skill_match(self, request):
        resume = Resume.objects.filter(user=request.user).first()
        if not resume or not resume.extracted_text:
            return Response({'detail': 'No parsed PDF resume found yet.'}, status=status.HTTP_400_BAD_REQUEST)

        job_id = request.query_params.get('job_id')
        job = Job.objects.filter(id=job_id).first()
        if not job:
            return Response({'detail': 'Job not found.'}, status=status.HTTP_404_NOT_FOUND)

        result = match_resume_skills(resume.extracted_text, job.description)
        return Response({'job_id': job.id, **result})
