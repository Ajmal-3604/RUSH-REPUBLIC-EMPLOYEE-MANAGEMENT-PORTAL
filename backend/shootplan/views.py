from django.db.models import Count, Prefetch, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from users.permissions import IsAuthenticatedFullAccess, IsElevated

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
    Base viewset for the Shoot Plan family of models.

    Shoot Plans are shared data -- every authenticated user, regardless of
    department, can see and edit all of them. `department` is only the
    interface context a plan was created/is being viewed under; passing
    ?department=<CODE> optionally narrows the list to that context (used by
    the department switcher), it is not an access boundary.
    """

    permission_classes = [IsAuthenticatedFullAccess]
    # Lookup path from the model to the owning department, e.g. 'shoot_plan__department'.
    department_lookup = 'department'

    def scope_queryset(self, queryset):
        requested = self.request.query_params.get('department')
        if requested:
            return queryset.filter(**{self.department_lookup: requested})
        return queryset


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
        else:
            # list/create -- completion_percent needs each reel's/photo's own
            # required fields (not just a count), so prefetch them here too,
            # kept cheap with .only() since nothing else on the list payload
            # needs the rest of their fields.
            queryset = queryset.prefetch_related(
                Prefetch('reels', queryset=Reel.objects.only('id', 'shoot_plan_id', 'title', 'concept')),
                Prefetch('photos', queryset=Photo.objects.only('id', 'shoot_plan_id', 'description')),
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

        # The Count(...) annotations above make Django silently drop the
        # model's default ordering (Meta.ordering doesn't survive a GROUP BY
        # query), so it has to be reapplied explicitly here or rows come
        # back in undefined/insertion order instead of newest-first.
        return queryset.order_by('-shoot_date', '-created_at')

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
    """
    /api/reels/ - reel deliverables. Filter with ?shoot_plan=<id>.

    Submit/approve/return-for-changes workflow lives in the actions below --
    approval_status and friends are read-only on the plain serializer (see
    ReelSerializer), so a normal PATCH can never set or bypass them.
    """

    serializer_class = ReelSerializer
    base_queryset = Reel.objects.all()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Any user with edit access (reels are shared data) submits a reel for
        Admin/Production Head review. DRAFT or RETURNED_FOR_CHANGES ->
        PENDING_APPROVAL. Refuses an incomplete reel, and refuses to
        resubmit one that's already pending or already approved.
        """
        reel = self.get_object()
        if reel.approval_status == Reel.ApprovalStatus.PENDING_APPROVAL:
            return Response({'detail': 'This reel is already pending approval.'}, status=status.HTTP_400_BAD_REQUEST)
        if reel.approval_status == Reel.ApprovalStatus.APPROVED:
            return Response({'detail': 'This reel is already approved.'}, status=status.HTTP_400_BAD_REQUEST)

        errors = {}
        if not reel.title.strip():
            errors['title'] = ['Reel title is required before submitting.']
        if not reel.concept.strip():
            errors['concept'] = ['Script is required before submitting.']
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        was_returned = reel.approval_status == Reel.ApprovalStatus.RETURNED_FOR_CHANGES
        reel.approval_status = Reel.ApprovalStatus.PENDING_APPROVAL
        reel.submitted_by = user
        reel.submitted_at = timezone.now()
        reel.save(update_fields=['approval_status', 'submitted_by', 'submitted_at', 'updated_at'])
        ReviewApproval.objects.create(
            shoot_plan=reel.shoot_plan, reel=reel,
            status=ReviewApproval.Status.SUBMITTED, reviewer=user, reviewed_at=timezone.now(),
        )
        ActivityLog.objects.create(
            shoot_plan=reel.shoot_plan,
            title=f'Reel "{reel.title}" {"resubmitted" if was_returned else "submitted"} for approval',
            actor=user,
        )
        return Response(ReelSerializer(reel, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsElevated])
    def approve(self, request, pk=None):
        """Admin/Production Head only -- enforced by IsElevated, not just a hidden button."""
        reel = self.get_object()
        if reel.approval_status != Reel.ApprovalStatus.PENDING_APPROVAL:
            return Response(
                {'detail': 'Only a reel pending approval can be approved.'}, status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        now = timezone.now()
        reel.approval_status = Reel.ApprovalStatus.APPROVED
        reel.approved_by = user
        reel.approved_at = now
        reel.suggestions = ''
        reel.save(update_fields=['approval_status', 'approved_by', 'approved_at', 'suggestions', 'updated_at'])
        ReviewApproval.objects.create(
            shoot_plan=reel.shoot_plan, reel=reel,
            status=ReviewApproval.Status.APPROVED, reviewer=user, reviewed_at=now,
        )
        ActivityLog.objects.create(shoot_plan=reel.shoot_plan, title=f'Reel "{reel.title}" approved', actor=user)
        return Response(ReelSerializer(reel, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='return', permission_classes=[IsElevated])
    def return_for_changes(self, request, pk=None):
        """Admin/Production Head only. Suggestions are mandatory -- 400 without them."""
        reel = self.get_object()
        if reel.approval_status != Reel.ApprovalStatus.PENDING_APPROVAL:
            return Response(
                {'detail': 'Only a reel pending approval can be returned for changes.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        suggestions = (request.data.get('suggestions') or '').strip()
        if not suggestions:
            return Response(
                {'suggestions': ['Please provide the changes required before returning this Reel for changes.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        now = timezone.now()
        reel.approval_status = Reel.ApprovalStatus.RETURNED_FOR_CHANGES
        reel.suggestions = suggestions
        reel.returned_by = user
        reel.returned_at = now
        reel.save(update_fields=['approval_status', 'suggestions', 'returned_by', 'returned_at', 'updated_at'])
        ReviewApproval.objects.create(
            shoot_plan=reel.shoot_plan, reel=reel,
            status=ReviewApproval.Status.CHANGES_REQUESTED, remarks=suggestions, reviewer=user, reviewed_at=now,
        )
        ActivityLog.objects.create(
            shoot_plan=reel.shoot_plan, title=f'Reel "{reel.title}" returned for changes', actor=user
        )
        return Response(ReelSerializer(reel, context={'request': request}).data)


class PhotoViewSet(ShootPlanChildViewSet):
    """
    /api/photos/ - photo brief / shot-list entries. Filter with ?shoot_plan=<id>.

    Submit/approve/return-for-changes workflow mirrors ReelViewSet exactly --
    approval_status and friends are read-only on the plain serializer, so a
    normal PATCH can never set or bypass them.
    """

    serializer_class = PhotoSerializer
    base_queryset = Photo.objects.all()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Any user with edit access (shots are shared data) submits a shot for
        Admin/Production Head review. DRAFT or RETURNED_FOR_CHANGES ->
        PENDING_APPROVAL. Refuses an incomplete shot, and refuses to
        resubmit one that's already pending or already approved.
        """
        photo = self.get_object()
        if photo.approval_status == Photo.ApprovalStatus.PENDING_APPROVAL:
            return Response({'detail': 'This shot is already pending approval.'}, status=status.HTTP_400_BAD_REQUEST)
        if photo.approval_status == Photo.ApprovalStatus.APPROVED:
            return Response({'detail': 'This shot is already approved.'}, status=status.HTTP_400_BAD_REQUEST)

        if not photo.description.strip():
            return Response(
                {'description': ['Shot description is required before submitting.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        was_returned = photo.approval_status == Photo.ApprovalStatus.RETURNED_FOR_CHANGES
        photo.approval_status = Photo.ApprovalStatus.PENDING_APPROVAL
        photo.submitted_by = user
        photo.submitted_at = timezone.now()
        photo.save(update_fields=['approval_status', 'submitted_by', 'submitted_at', 'updated_at'])
        ReviewApproval.objects.create(
            shoot_plan=photo.shoot_plan, photo=photo,
            status=ReviewApproval.Status.SUBMITTED, reviewer=user, reviewed_at=timezone.now(),
        )
        ActivityLog.objects.create(
            shoot_plan=photo.shoot_plan,
            title=f'Shot "{photo.title or photo.description[:40]}" {"resubmitted" if was_returned else "submitted"} for approval',
            actor=user,
        )
        return Response(PhotoSerializer(photo, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsElevated])
    def approve(self, request, pk=None):
        """Admin/Production Head only -- enforced by IsElevated, not just a hidden button."""
        photo = self.get_object()
        if photo.approval_status != Photo.ApprovalStatus.PENDING_APPROVAL:
            return Response(
                {'detail': 'Only a shot pending approval can be approved.'}, status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        now = timezone.now()
        photo.approval_status = Photo.ApprovalStatus.APPROVED
        photo.approved_by = user
        photo.approved_at = now
        photo.suggestions = ''
        photo.save(update_fields=['approval_status', 'approved_by', 'approved_at', 'suggestions', 'updated_at'])
        ReviewApproval.objects.create(
            shoot_plan=photo.shoot_plan, photo=photo,
            status=ReviewApproval.Status.APPROVED, reviewer=user, reviewed_at=now,
        )
        ActivityLog.objects.create(
            shoot_plan=photo.shoot_plan, title=f'Shot "{photo.title or photo.description[:40]}" approved', actor=user
        )
        return Response(PhotoSerializer(photo, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='return', permission_classes=[IsElevated])
    def return_for_changes(self, request, pk=None):
        """Admin/Production Head only. Suggestions are mandatory -- 400 without them."""
        photo = self.get_object()
        if photo.approval_status != Photo.ApprovalStatus.PENDING_APPROVAL:
            return Response(
                {'detail': 'Only a shot pending approval can be returned for changes.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        suggestions = (request.data.get('suggestions') or '').strip()
        if not suggestions:
            return Response(
                {'suggestions': ['Please provide the changes required before returning this Shot for changes.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        now = timezone.now()
        photo.approval_status = Photo.ApprovalStatus.RETURNED_FOR_CHANGES
        photo.suggestions = suggestions
        photo.returned_by = user
        photo.returned_at = now
        photo.save(update_fields=['approval_status', 'suggestions', 'returned_by', 'returned_at', 'updated_at'])
        ReviewApproval.objects.create(
            shoot_plan=photo.shoot_plan, photo=photo,
            status=ReviewApproval.Status.CHANGES_REQUESTED, remarks=suggestions, reviewer=user, reviewed_at=now,
        )
        ActivityLog.objects.create(
            shoot_plan=photo.shoot_plan,
            title=f'Shot "{photo.title or photo.description[:40]}" returned for changes',
            actor=user,
        )
        return Response(PhotoSerializer(photo, context={'request': request}).data)


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

    Shoot Plan data is shared across every department (see
    DepartmentScopedViewSet) -- any authenticated user can view or attach
    photos here, regardless of which department owns the parent record.
    """

    permission_classes = [IsAuthenticatedFullAccess]
    parent_field = None       # e.g. 'plan_model'
    department_lookup = None  # e.g. 'plan_model__shoot_plan__department'

    def get_queryset(self):
        queryset = self.base_queryset
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
