from django.db.models import Count, Prefetch, Q, Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from users.permissions import IsAdminOrOwnDepartment

from .models import (
    ShootPlan,
    Reel,
    ReelPhoto,
    Photo,
    PhotoBriefImage,
    PhotoReferenceLink,
    PlanModel,
    PlanModelPhoto,
    PlanLocation,
    PlanLocationPhoto,
    Prop,
    PropPhoto,
    TravelExpense,
    CrewMember,
    BudgetItem,
    ReviewApproval,
    ActivityLog,
    Feedback,
)
from .serializers import (
    ShootPlanListSerializer,
    ShootPlanDetailSerializer,
    ReelSerializer,
    ReelPhotoSerializer,
    PhotoSerializer,
    PhotoBriefImageSerializer,
    PhotoReferenceLinkSerializer,
    PlanModelSerializer,
    PlanModelPhotoSerializer,
    PlanLocationSerializer,
    PlanLocationPhotoSerializer,
    PropSerializer,
    PropPhotoSerializer,
    TravelExpenseSerializer,
    CrewMemberSerializer,
    BudgetItemSerializer,
    ReviewApprovalSerializer,
    FeedbackSerializer,
)


class DepartmentScopedViewSet(viewsets.ModelViewSet):
    """
    Base viewset for the department-scoped Shoot Plan models.

    Admin sees everything and may optionally narrow with ?department=<CODE>.
    Every other user is hard-filtered to their own department -- there is no
    query parameter that widens it.
    """

    permission_classes = [IsAdminOrOwnDepartment]
    # Lookup path from the model to the owning department, e.g. 'shoot_plan__department'.
    department_lookup = 'department'

    def scope_queryset(self, queryset):
        user = self.request.user
        if user.is_elevated:
            requested = self.request.query_params.get('department')
            if requested:
                return queryset.filter(**{self.department_lookup: requested})
            return queryset
        return queryset.filter(**{self.department_lookup: user.department})


class ShootPlanViewSet(DepartmentScopedViewSet):
    """
    /api/shoot-plans/            list + create
    /api/shoot-plans/<id>/       retrieve + update + delete (all categories nested on read)
    /api/shoot-plans/summary/    counts for the current scope
    """

    department_lookup = 'department'

    def get_serializer_class(self):
        if self.action in ('list', 'create'):
            return ShootPlanListSerializer
        return ShootPlanDetailSerializer

    def get_queryset(self):
        queryset = (
            ShootPlan.objects.select_related('created_by')
            .prefetch_related(
                'budget_items',
                Prefetch('reviews', queryset=ReviewApproval.objects.select_related('reviewer')),
                Prefetch('activity_log', queryset=ActivityLog.objects.select_related('actor')),
            )
            .annotate(
                reel_count=Count('reels', distinct=True),
                photo_count=Count('photos', distinct=True),
                crew_count=Count('crew', distinct=True),
                feedback_count=Count('feedback', distinct=True),
                budget_item_count=Count('budget_items', distinct=True),
                travel_expense_count=Count('travel_expenses', distinct=True),
            )
        )

        if self.action in ('retrieve', 'update', 'partial_update'):
            queryset = queryset.prefetch_related(
                'plan_models__photos_gallery',
                'plan_locations__photos_gallery',
                'props__photos_gallery',
                'reels__photos_gallery', 'reels__assigned_models', 'reels__assigned_locations', 'reels__assigned_props',
                'photos__photos_gallery', 'photos__assigned_models', 'photos__assigned_locations', 'photos__assigned_props',
                'crew', 'travel_expenses',
                Prefetch('feedback', queryset=Feedback.objects.select_related('author', 'shoot_plan')),
            )

        queryset = self.scope_queryset(queryset)

        plan_status = self.request.query_params.get('status')
        if plan_status:
            queryset = queryset.filter(status=plan_status)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(client_name__icontains=search)
                | Q(location__icontains=search)
            )

        return queryset

    def destroy(self, request, *args, **kwargs):
        """Only Admin may delete a whole shoot plan -- it cascades to every category."""
        if not request.user.is_elevated:
            return Response(
                {'detail': 'Only Admin can delete a shoot plan.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.scope_queryset(ShootPlan.objects.all())
        budget = BudgetItem.objects.filter(shoot_plan__in=queryset).aggregate(
            allocated=Sum('allocated_amount'), spent=Sum('spent_amount')
        )
        return Response({
            'total': queryset.count(),
            'by_status': {
                row['status']: row['total']
                for row in queryset.values('status').annotate(total=Count('id'))
            },
            'reels': Reel.objects.filter(shoot_plan__in=queryset).count(),
            'photos': Photo.objects.filter(shoot_plan__in=queryset).count(),
            'crew': CrewMember.objects.filter(shoot_plan__in=queryset).count(),
            'pending_approvals': ReviewApproval.objects.filter(
                shoot_plan__in=queryset, status=ReviewApproval.Status.PENDING
            ).count(),
            'budget_allocated': float(budget['allocated'] or 0),
            'budget_spent': float(budget['spent'] or 0),
        })


class ShootPlanChildViewSet(DepartmentScopedViewSet):
    """Shared list/create/update/delete for records owned by a ShootPlan."""

    department_lookup = 'shoot_plan__department'
    base_queryset = None

    def get_queryset(self):
        queryset = self.scope_queryset(self.base_queryset.select_related('shoot_plan'))
        plan_id = self.request.query_params.get('shoot_plan')
        if plan_id:
            queryset = queryset.filter(shoot_plan_id=plan_id)
        return queryset


class ReelViewSet(ShootPlanChildViewSet):
    """/api/reels/ - reel deliverables. Filter with ?shoot_plan=<id>."""

    serializer_class = ReelSerializer
    base_queryset = Reel.objects.all()


class PhotoViewSet(ShootPlanChildViewSet):
    """/api/photos/ - photo brief / shot-list entries. Filter with ?shoot_plan=<id>."""

    serializer_class = PhotoSerializer
    base_queryset = Photo.objects.all()


class PlanModelViewSet(ShootPlanChildViewSet):
    """/api/plan-models/ - Step 2 (People & Models) bookings. Filter with ?shoot_plan=<id>."""

    serializer_class = PlanModelSerializer
    base_queryset = PlanModel.objects.select_related('directory_model').all()


class PlanLocationViewSet(ShootPlanChildViewSet):
    """/api/plan-locations/ - Step 3 (Locations). Filter with ?shoot_plan=<id>."""

    serializer_class = PlanLocationSerializer
    base_queryset = PlanLocation.objects.all()


class PropViewSet(ShootPlanChildViewSet):
    """/api/props/ - Step 6 (Props). Filter with ?shoot_plan=<id>."""

    serializer_class = PropSerializer
    base_queryset = Prop.objects.all()


class TravelExpenseViewSet(ShootPlanChildViewSet):
    """/api/travel-expenses/ - Step 8 (Budget Allowance) travel line items. Filter with ?shoot_plan=<id>."""

    serializer_class = TravelExpenseSerializer
    base_queryset = TravelExpense.objects.all()


class NestedGalleryViewSet(viewsets.ModelViewSet):
    """
    Shared list/create/delete for a photo gallery attached to a Shoot Plan
    grandchild (a model booking, a location, a prop, a reel, a photo brief).

    Scoped through the parent's shoot_plan department, two joins deep --
    e.g. `plan_model__shoot_plan__department` -- so a user can only attach
    or view photos on records their department (or Admin) already owns.
    """

    permission_classes = [IsAdminOrOwnDepartment]
    parent_field = None       # e.g. 'plan_model'
    department_lookup = None  # e.g. 'plan_model__shoot_plan__department'

    def get_queryset(self):
        user = self.request.user
        queryset = self.base_queryset
        if not user.is_elevated:
            queryset = queryset.filter(**{self.department_lookup: user.department})
        parent_id = self.request.query_params.get(self.parent_field)
        if parent_id:
            queryset = queryset.filter(**{f'{self.parent_field}_id': parent_id})
        return queryset


class PlanModelPhotoViewSet(NestedGalleryViewSet):
    """/api/plan-model-photos/ - photos for a model booking. Filter with ?plan_model=<id>."""

    serializer_class = PlanModelPhotoSerializer
    base_queryset = PlanModelPhoto.objects.select_related('plan_model__shoot_plan')
    parent_field = 'plan_model'
    department_lookup = 'plan_model__shoot_plan__department'


class PlanLocationPhotoViewSet(NestedGalleryViewSet):
    """/api/plan-location-photos/ - photos for a location. Filter with ?plan_location=<id>."""

    serializer_class = PlanLocationPhotoSerializer
    base_queryset = PlanLocationPhoto.objects.select_related('plan_location__shoot_plan')
    parent_field = 'plan_location'
    department_lookup = 'plan_location__shoot_plan__department'


class PropPhotoViewSet(NestedGalleryViewSet):
    """/api/prop-photos/ - reference photos for a prop. Filter with ?prop=<id>."""

    serializer_class = PropPhotoSerializer
    base_queryset = PropPhoto.objects.select_related('prop__shoot_plan')
    parent_field = 'prop'
    department_lookup = 'prop__shoot_plan__department'


class ReelPhotoViewSet(NestedGalleryViewSet):
    """/api/reel-photos/ - storyboard frames for a reel. Filter with ?reel=<id>."""

    serializer_class = ReelPhotoSerializer
    base_queryset = ReelPhoto.objects.select_related('reel__shoot_plan')
    parent_field = 'reel'
    department_lookup = 'reel__shoot_plan__department'


class PhotoBriefImageViewSet(NestedGalleryViewSet):
    """/api/photo-brief-images/ - moodboard frames for a photo brief. Filter with ?photo=<id>."""

    serializer_class = PhotoBriefImageSerializer
    base_queryset = PhotoBriefImage.objects.select_related('photo__shoot_plan')
    parent_field = 'photo'
    department_lookup = 'photo__shoot_plan__department'


class PhotoReferenceLinkViewSet(NestedGalleryViewSet):
    """/api/photo-reference-links/ - reference links for a photo brief. Filter with ?photo=<id>."""

    serializer_class = PhotoReferenceLinkSerializer
    base_queryset = PhotoReferenceLink.objects.select_related('photo__shoot_plan')
    parent_field = 'photo'
    department_lookup = 'photo__shoot_plan__department'


class CrewMemberViewSet(ShootPlanChildViewSet):
    """/api/crew/ - shoot crew. Filter with ?shoot_plan=<id>."""

    serializer_class = CrewMemberSerializer
    base_queryset = CrewMember.objects.all()


class BudgetItemViewSet(ShootPlanChildViewSet):
    """/api/budget-items/ - budget allowance lines. Filter with ?shoot_plan=<id>."""

    serializer_class = BudgetItemSerializer
    base_queryset = BudgetItem.objects.all()


class ReviewApprovalViewSet(ShootPlanChildViewSet):
    """/api/reviews/ - review & approval rounds. Filter with ?shoot_plan=<id>."""

    serializer_class = ReviewApprovalSerializer
    base_queryset = ReviewApproval.objects.select_related('reviewer').all()


class FeedbackViewSet(DepartmentScopedViewSet):
    """
    /api/feedback/ - the Feedback module.

    Admin: sees, edits and deletes all feedback, and can write admin_response.
    Everyone else: sees only their own department's feedback, and may edit or
    delete only the entries they authored.
    """

    serializer_class = FeedbackSerializer
    department_lookup = 'department'

    def get_queryset(self):
        queryset = self.scope_queryset(
            Feedback.objects.select_related('author', 'shoot_plan')
        )
        plan_id = self.request.query_params.get('shoot_plan')
        if plan_id:
            queryset = queryset.filter(shoot_plan_id=plan_id)
        feedback_status = self.request.query_params.get('status')
        if feedback_status:
            queryset = queryset.filter(status=feedback_status)
        if self.request.query_params.get('mine') == 'true':
            queryset = queryset.filter(author=self.request.user)
        return queryset

    def _assert_can_write(self, instance):
        """Non-admins may only modify feedback they authored."""
        user = self.request.user
        if user.is_elevated or instance.author_id == user.id:
            return None
        return Response(
            {'detail': 'You can only modify feedback you created.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    def update(self, request, *args, **kwargs):
        denied = self._assert_can_write(self.get_object())
        return denied or super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        denied = self._assert_can_write(self.get_object())
        return denied or super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        denied = self._assert_can_write(self.get_object())
        return denied or super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.get_queryset()
        return Response({
            'total': queryset.count(),
            'by_status': {
                row['status']: row['total']
                for row in queryset.values('status').annotate(total=Count('id'))
            },
            'by_department': {
                row['department']: row['total']
                for row in queryset.values('department').annotate(total=Count('id'))
            },
            'average_rating': round(
                sum(f.rating for f in queryset) / queryset.count(), 2
            ) if queryset.count() else 0,
        })
