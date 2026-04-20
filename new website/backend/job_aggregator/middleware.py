import logging

from django.http import JsonResponse

logger = logging.getLogger(__name__)


class ApiJsonErrorMiddleware:
    """
    Guarantee JSON responses for API routes, even for unhandled exceptions.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
        except Exception:
            if request.path.startswith('/api/'):
                logger.exception('Unhandled API exception for %s', request.path)
                return JsonResponse({'error': 'Internal server error.'}, status=500)
            raise

        if request.path.startswith('/api/'):
            content_type = response.get('Content-Type', '')
            if response.status_code >= 400 and 'application/json' not in content_type:
                logger.error(
                    'Non-JSON API error response intercepted at %s (status=%s, content_type=%s).',
                    request.path,
                    response.status_code,
                    content_type,
                )
                return JsonResponse({'error': 'Request failed.'}, status=response.status_code)

        return response
