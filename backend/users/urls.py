from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    DepartmentListView,
    SignupView,
    LoginView,
    LogoutView,
    ProfileView,
    AdminDashboardView,
    SocialMediaView,
    ProductionCoordinatorView,
    ClientServicingView,
    ScriptWriterView,
    SwitchDepartmentView,
    AdminUserViewSet,
)

router = DefaultRouter()
router.register(r'users', AdminUserViewSet, basename='users')

urlpatterns = [
    # --- Auth ---------------------------------------------------------------
    path('departments/', DepartmentListView.as_view(), name='departments'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='login-refresh'),
    path('login/verify/', TokenVerifyView.as_view(), name='login-verify'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),

    # --- Department dashboards ---------------------------------------------
    path('admin-dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('social-media/', SocialMediaView.as_view(), name='social-media'),
    path('production-coordinator/', ProductionCoordinatorView.as_view(), name='production-coordinator'),
    path('client-servicing/', ClientServicingView.as_view(), name='client-servicing'),
    path('script-writer/', ScriptWriterView.as_view(), name='script-writer'),

    # --- Admin-only department switching + user management ------------------
    path('switch-department/', SwitchDepartmentView.as_view(), name='switch-department'),
    path('', include(router.urls)),
]
