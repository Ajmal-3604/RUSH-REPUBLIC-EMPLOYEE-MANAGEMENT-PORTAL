from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Sum
from rest_framework import status, generics, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from shootplan.models import ShootPlan, Feedback, Reel, Photo, BudgetItem, ReviewApproval

from .models import CustomUser, Department
from .serializers import (
    SignupSerializer,
    UserSerializer,
    AdminUserWriteSerializer,
    CustomTokenObtainPairSerializer,
)
from .permissions import (
    IsAdmin,
    IsElevated,
    IsSocialMedia,
    IsProductionCoordinator,
    IsClientServicing,
    IsScriptWriter,
)

# Every department lands on the same Shoot Plans dashboard; the API scopes
# the rows. Mirrored in frontend/src/constants/departments.js -- keep in sync.
DEPARTMENT_HOME_ROUTES = {value: '/shoot-plans' for value in Department.values}


class DepartmentListView(APIView):
    """GET /api/departments/ - public list powering the signup dropdown."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response([
            {'value': value, 'label': label, 'home_route': DEPARTMENT_HOME_ROUTES[value]}
            for value, label in Department.choices
        ])


class SignupView(generics.CreateAPIView):
    """POST /api/signup/ - register a new employee."""

    queryset = CustomUser.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'message': 'Account created successfully',
                'user': UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/login/ - authenticate with email + password, returns JWT pair + user info."""

    permission_classes = [permissions.AllowAny]
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            department = response.data['user']['department']
            response.data['message'] = 'Logged in successfully'
            response.data['home_route'] = DEPARTMENT_HOME_ROUTES.get(department, '/login')
        return response


class LogoutView(APIView):
    """POST /api/logout/ - blacklists the refresh token to invalidate the session."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'error': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            RefreshToken(refresh_token).blacklist()
        except Exception:
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/profile/ - returns the logged-in user's details.
    PATCH /api/profile/ - lets a user update their own username/contact.
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        for field in ('username', 'contact'):
            if field in request.data:
                setattr(user, field, request.data[field])
        try:
            user.full_clean(exclude=['password', 'department', 'email'])
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
        user.save()
        return Response(UserSerializer(user).data)


def _department_summary(department):
    """Counts + budget totals for a single department, used by every dashboard."""
    plans = ShootPlan.objects.filter(department=department)
    budget = BudgetItem.objects.filter(shoot_plan__department=department).aggregate(
        allocated=Sum('allocated_amount'), spent=Sum('spent_amount')
    )
    return {
        'shoot_plans': plans.count(),
        'shoot_plans_by_status': {
            row['status']: row['total']
            for row in plans.values('status').annotate(total=Count('id'))
        },
        'reels': Reel.objects.filter(shoot_plan__department=department).count(),
        'photos': Photo.objects.filter(shoot_plan__department=department).count(),
        'pending_approvals': ReviewApproval.objects.filter(
            shoot_plan__department=department, status=ReviewApproval.Status.PENDING
        ).count(),
        'feedback_count': Feedback.objects.filter(department=department).count(),
        'budget_allocated': float(budget['allocated'] or 0),
        'budget_spent': float(budget['spent'] or 0),
    }


class AdminDashboardView(APIView):
    """GET /api/admin-dashboard/ - Admin-only: org-wide totals + per-department breakdown."""

    permission_classes = [IsAdmin]

    def get(self, request):
        budget = BudgetItem.objects.aggregate(allocated=Sum('allocated_amount'), spent=Sum('spent_amount'))

        return Response({
            'message': 'This is Admin Home Page',
            'user': UserSerializer(request.user).data,
            'total_users': CustomUser.objects.count(),
            'total_shoot_plans': ShootPlan.objects.count(),
            'total_feedback': Feedback.objects.count(),
            'pending_approvals': ReviewApproval.objects.filter(
                status=ReviewApproval.Status.PENDING
            ).count(),
            'budget_allocated': float(budget['allocated'] or 0),
            'budget_spent': float(budget['spent'] or 0),
            'users_by_department': {
                label: CustomUser.objects.filter(department=value).count()
                for value, label in Department.choices
            },
            'departments': [
                {
                    'value': value,
                    'label': label,
                    'home_route': DEPARTMENT_HOME_ROUTES[value],
                    **_department_summary(value),
                }
                for value, label in Department.choices
                if value != Department.ADMIN
            ],
            'recent_users': UserSerializer(CustomUser.objects.all()[:10], many=True).data,
        })


class BaseDepartmentHomeView(APIView):
    """Shared shape for the four non-admin department dashboards."""

    department = None
    page_title = ''

    def get(self, request):
        return Response({
            'message': self.page_title,
            'department': self.department,
            'department_display': dict(Department.choices)[self.department],
            'user': UserSerializer(request.user).data,
            'summary': _department_summary(self.department),
            'recent_shoot_plans': [
                {
                    'id': plan.id,
                    'title': plan.title,
                    'client_name': plan.client_name,
                    'status': plan.status,
                    'shoot_date': plan.shoot_date,
                }
                for plan in ShootPlan.objects.filter(department=self.department)[:5]
            ],
        })


class SocialMediaView(BaseDepartmentHomeView):
    """GET /api/social-media/ - Social Media department (+ Admin)."""

    permission_classes = [IsSocialMedia]
    department = Department.SOCIAL_MEDIA
    page_title = 'This is Social Media Home Page'


class ProductionCoordinatorView(BaseDepartmentHomeView):
    """GET /api/production-coordinator/ - Production Co-Ordinator department (+ Admin)."""

    permission_classes = [IsProductionCoordinator]
    department = Department.PRODUCTION_COORDINATOR
    page_title = 'This is Production Co-Ordinator Home Page'


class ClientServicingView(BaseDepartmentHomeView):
    """GET /api/client-servicing/ - Client-Servicing department (+ Admin)."""

    permission_classes = [IsClientServicing]
    department = Department.CLIENT_SERVICING
    page_title = 'This is Client-Servicing Home Page'


class ScriptWriterView(BaseDepartmentHomeView):
    """GET /api/script-writer/ - Script Writer department (+ Admin)."""

    permission_classes = [IsScriptWriter]
    department = Department.SCRIPT_WRITER
    page_title = 'This is Script Writer Home Page'


class SwitchDepartmentView(APIView):
    """
    POST /api/switch-department/ - Admin and Production Head only.

    Validates the requested department and hands back the route to navigate to.
    Non-elevated users get 403 here, which is what stops a hand-crafted request
    from doing what the hidden UI control won't. Production Head additionally
    cannot switch into Admin -- "full access except Admin" is enforced here,
    not just by hiding the option in the dropdown.
    """

    permission_classes = [IsElevated]

    def post(self, request):
        department = request.data.get('department')
        if department not in Department.values:
            return Response(
                {'error': 'Unknown department.', 'valid': Department.values},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if department == Department.ADMIN and not request.user.is_admin:
            return Response(
                {'error': 'Only Admin can switch into the Admin department.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({
            'department': department,
            'department_display': dict(Department.choices)[department],
            'home_route': DEPARTMENT_HOME_ROUTES[department],
        })


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    /api/users/ - Admin-only CRUD over every employee account.

    Supports ?department=SOCIAL_MEDIA and ?search=<text> filtering.
    """

    permission_classes = [IsAdmin]
    serializer_class = AdminUserWriteSerializer

    def get_queryset(self):
        queryset = CustomUser.objects.all()
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department=department)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(username__icontains=search) | queryset.filter(
                email__icontains=search
            )
        return queryset.distinct()

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response(
                {'error': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response(
                {'error': 'You cannot deactivate your own account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.is_active = not user.is_active
        user.save(update_fields=['is_active', 'updated_at'])
        return Response(UserSerializer(user).data)
