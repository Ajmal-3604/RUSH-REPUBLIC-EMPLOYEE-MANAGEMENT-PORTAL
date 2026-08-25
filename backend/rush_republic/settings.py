"""
Django settings for the Rush Republic Employee Management Portal.
"""

import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Core settings
# ---------------------------------------------------------------------------
SECRET_KEY = config('SECRET_KEY')
# Defaults to False on purpose -- DEBUG must be explicitly turned on for local
# dev (backend/.env sets it), never silently left on by a missing env var.
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# Render sets this automatically to the service's *.onrender.com hostname --
# trust it without requiring a manual ALLOWED_HOSTS edit per deploy.
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # 3rd party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',

    # local
    'users',
    'shootplan',
    'directory',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # Serves collected static files directly from gunicorn -- Render's plan
    # doesn't put Nginx in front of a web service, so something has to.
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'rush_republic.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'rush_republic.wsgi.application'
ASGI_APPLICATION = 'rush_republic.asgi.application'

# ---------------------------------------------------------------------------
# Database - PostgreSQL
#
# Render (and most PaaS providers) hand you one connection string via
# DATABASE_URL rather than five separate DB_* vars. Prefer that when it's
# set; fall back to the individual DB_* vars for local dev, so
# backend/.env's existing DB_NAME/DB_USER/... keeps working unchanged.
# ---------------------------------------------------------------------------
DATABASE_URL = config('DATABASE_URL', default='')
if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600, ssl_require=not DEBUG)
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='rush_republic_final_db'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default='postgres'),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }

# ---------------------------------------------------------------------------
# Custom user model
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = 'users.CustomUser'

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
STATIC_URL = 'static/'
# `collectstatic` (run at deploy time, see Render build command) gathers
# everything here; WhiteNoise serves it straight from gunicorn in production.
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# Media (uploaded brand logos, team/freelancer/model photos)
#
# NOTE for deployment: this is local-disk storage. Render's filesystem is
# NOT persistent across deploys/restarts for a web service -- anything
# uploaded here will be lost on the next deploy. Fine for local dev; for a
# real production rollout, point this at object storage (e.g. Cloudinary,
# AWS S3 via django-storages) instead. Not changed here since that requires
# picking/paying for a provider -- flagging it rather than guessing for you.
# ---------------------------------------------------------------------------
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ),
    'DEFAULT_PAGINATION_CLASS': None,
}

# ---------------------------------------------------------------------------
# Simple JWT
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

INSTALLED_APPS.append('rest_framework_simplejwt.token_blacklist')

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config('CORS_ORIGIN', default='http://localhost:3000', cast=Csv())
CORS_ALLOW_CREDENTIALS = True

# The Django admin site is session/cookie-based (not JWT), so it needs its
# own CSRF-trusted origin list once it's served over HTTPS from a Render
# domain. Falls back to CORS_ORIGIN's value when CSRF_TRUSTED_ORIGINS is
# unset OR present-but-blank (python-decouple's own `default=` only kicks in
# when the key is fully absent, not when it's an empty string -- and
# .env.example ships this key present-but-blank) since the frontend
# origin(s) are almost always the right value here too.
_csrf_trusted = config('CSRF_TRUSTED_ORIGINS', default='')
CSRF_TRUSTED_ORIGINS = Csv()(_csrf_trusted) if _csrf_trusted else CORS_ALLOWED_ORIGINS

# ---------------------------------------------------------------------------
# Render (and most PaaS providers) terminate HTTPS at a proxy and forward
# plain HTTP to the app with this header set -- without it, Django can't
# tell the request was actually HTTPS, which breaks secure-cookie/CSRF logic.
# ---------------------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Guarded by `not DEBUG` so local dev (plain HTTP on localhost) is untouched --
# these would break `manage.py runserver` if always on. Answers exactly the
# warnings `manage.py check --deploy` raises.
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7  # 1 week; raise once HTTPS is confirmed stable
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
