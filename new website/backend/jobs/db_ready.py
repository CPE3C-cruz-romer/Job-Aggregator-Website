import logging
from threading import Lock

from django.core.management import call_command
from django.db import connection

logger = logging.getLogger(__name__)

_DB_READY = False
_DB_READY_LOCK = Lock()
_REQUIRED_TABLES = {
    'auth_user',
    'jobs_job',
    'jobs_employerprofile',
    'jobs_userprofile',
    'jobs_savedjob',
    'jobs_application',
    'jobs_resume',
}
_REQUIRED_COLUMNS = {
    'jobs_job': {'id', 'title', 'company', 'location', 'description', 'requirements', 'url'},
    'jobs_resume': {'id', 'user_id', 'file', 'image', 'extracted_text', 'uploaded_at'},
}


def ensure_db_ready():
    """
    Ensure required tables exist. If not, run migrations once.
    Safe to call from request handlers.
    """
    global _DB_READY
    if _DB_READY:
        return

    with _DB_READY_LOCK:
        if _DB_READY:
            return

        existing_tables = set(connection.introspection.table_names())
        if _REQUIRED_TABLES.issubset(existing_tables) and _required_columns_exist():
            _DB_READY = True
            return

        logger.warning('Database tables missing. Running migrations automatically.')
        call_command('migrate', interactive=False, run_syncdb=True, verbosity=0)

        existing_tables = set(connection.introspection.table_names())
        if not _REQUIRED_TABLES.issubset(existing_tables):
            raise RuntimeError('Database migration did not create required tables.')
        if not _required_columns_exist():
            raise RuntimeError('Database migration did not create required schema columns.')

        _DB_READY = True


def _required_columns_exist():
    for table_name, required_columns in _REQUIRED_COLUMNS.items():
        try:
            with connection.cursor() as cursor:
                table_description = connection.introspection.get_table_description(cursor, table_name)
        except Exception:
            return False

        existing_columns = {column.name for column in table_description}
        if not required_columns.issubset(existing_columns):
            return False
    return True
