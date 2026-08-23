"""
Test settings for the Rush Republic portal.

Django needs CREATEDB on the database role to build a throwaway test database.
The application role (`rush_republic_user`) intentionally does not have it, so
this module swaps in an in-memory SQLite database for the test run:

    python manage.py test --settings=rush_republic.settings_test

Nothing in the models or queries is PostgreSQL-specific, so the suite is a
faithful check of the same code paths. To run the suite against real
PostgreSQL instead, grant the privilege once as a superuser:

    ALTER ROLE rush_republic_user CREATEDB;

and then run `python manage.py test` with the default settings.
"""

from .settings import *  # noqa: F401,F403

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Fast, deterministic hashing -- test-only, never used by the running app.
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

# Keep validation strict so the strong-password tests stay meaningful.
DEBUG = False
