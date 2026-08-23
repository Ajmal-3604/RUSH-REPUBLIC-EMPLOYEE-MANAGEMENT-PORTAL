from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Auth, profile, department dashboards, admin user management
    path('api/', include('users.urls')),
    # Shoot Plan module: plans, reels, photos, crew, budget, reviews, feedback
    path('api/', include('shootplan.urls')),
    # Directory: brands, team, freelancers, models
    path('api/', include('directory.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
