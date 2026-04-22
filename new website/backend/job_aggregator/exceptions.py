from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if isinstance(response.data, list):
        return Response({'error': ' '.join(str(item) for item in response.data)}, status=response.status_code)

    if isinstance(response.data, dict):
        if response.data.get('code') == 'token_not_valid':
            response.data = {'error': 'Session expired or invalid token. Please login again.'}
            return response
        if 'detail' in response.data and isinstance(response.data['detail'], str):
            response.data = {'error': response.data['detail']}
        elif 'error' not in response.data:
            response.data = {'error': 'Validation failed.', 'details': response.data}
    else:
        response.data = {'error': str(response.data)}

    return response
