from django.utils import timezone
from rest_framework import serializers

from users.models import Department

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


class ShootPlanChildSerializer(serializers.ModelSerializer):
    """
    Shared behaviour for every child of a ShootPlan.

    Validates on write that the caller is allowed to attach records to the
    target plan -- without this, a Social Media user could POST a reel onto a
    Client-Servicing plan by guessing its id.
    """

    department = serializers.ReadOnlyField()

    def validate_shoot_plan(self, plan):
        user = self.context['request'].user
        if not user.can_access_department(plan.department):
            raise serializers.ValidationError(
                'You cannot attach records to a shoot plan from another department.'
            )
        return plan


class ShootPlanGrandchildSerializer(serializers.ModelSerializer):
    """
    Shared behaviour for photo galleries / reference links attached to a
    model booking, location, prop, reel, or photo brief -- one level below
    ShootPlanChildSerializer. Without this, a user could POST a photo or
    link onto another department's model/location/prop/reel/brief by
    guessing its id, since the FK field alone only checks the row exists,
    not who owns it. Subclasses set `parent_field` to the FK's name (e.g.
    'plan_model'); every parent model exposes `.shoot_plan.department`.
    """

    parent_field = None

    def validate(self, attrs):
        parent = attrs.get(self.parent_field)
        if parent is not None:
            user = self.context['request'].user
            if not user.can_access_department(parent.shoot_plan.department):
                raise serializers.ValidationError({
                    self.parent_field: 'You cannot attach records to another department\'s data.'
                })
        return super().validate(attrs)


class PlanModelPhotoSerializer(ShootPlanGrandchildSerializer):
    parent_field = 'plan_model'
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = PlanModelPhoto
        fields = ['id', 'plan_model', 'category', 'category_display', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']


class PlanModelSerializer(ShootPlanChildSerializer):
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    directory_model_name = serializers.CharField(source='directory_model.name', read_only=True, default=None)
    directory_model_age = serializers.IntegerField(source='directory_model.age', read_only=True, default=None)
    directory_model_gender_display = serializers.CharField(
        source='directory_model.get_gender_display', read_only=True, default=None
    )
    directory_model_photo = serializers.ImageField(source='directory_model.photo', read_only=True, default=None)
    directory_model_notes = serializers.CharField(source='directory_model.notes', read_only=True, default=None)
    photos = PlanModelPhotoSerializer(many=True, read_only=True, source='photos_gallery')

    class Meta:
        model = PlanModel
        fields = [
            'id', 'shoot_plan', 'order', 'from_directory', 'directory_model', 'directory_model_name',
            'directory_model_age', 'directory_model_gender_display', 'directory_model_photo', 'directory_model_notes',
            'name', 'country_code', 'phone', 'email', 'agency', 'alt_contact', 'negotiated_cost',
            'notes', 'time_in', 'time_out', 'approval_status', 'approval_status_display',
            'photos', 'department', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PlanLocationPhotoSerializer(ShootPlanGrandchildSerializer):
    parent_field = 'plan_location'
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = PlanLocationPhoto
        fields = ['id', 'plan_location', 'category', 'category_display', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']


class PlanLocationSerializer(ShootPlanChildSerializer):
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    permit_status_display = serializers.CharField(source='get_permit_status_display', read_only=True)
    photos = PlanLocationPhotoSerializer(many=True, read_only=True, source='photos_gallery')

    class Meta:
        model = PlanLocation
        fields = [
            'id', 'shoot_plan', 'order', 'name', 'address', 'map_url',
            'permit_status', 'permit_status_display', 'contact_name', 'contact_phone',
            'access_notes', 'time_in', 'time_out', 'approval_status', 'approval_status_display',
            'budget_cost', 'photos', 'department', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PropPhotoSerializer(ShootPlanGrandchildSerializer):
    parent_field = 'prop'
    class Meta:
        model = PropPhoto
        fields = ['id', 'prop', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']


class PropSerializer(ShootPlanChildSerializer):
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    photos = PropPhotoSerializer(many=True, read_only=True, source='photos_gallery')

    class Meta:
        model = Prop
        fields = [
            'id', 'shoot_plan', 'order', 'name', 'quantity', 'source', 'source_display',
            'unit_cost', 'total_cost', 'notes', 'status', 'status_display',
            'photos', 'department', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        quantity = attrs.get('quantity', getattr(self.instance, 'quantity', 1))
        unit_cost = attrs.get('unit_cost', getattr(self.instance, 'unit_cost', 0))
        if quantity is not None and quantity < 1:
            raise serializers.ValidationError({'quantity': 'Quantity must be at least 1.'})
        if unit_cost is not None and unit_cost < 0:
            raise serializers.ValidationError({'unit_cost': 'Unit cost cannot be negative.'})
        return attrs


class ReelPhotoSerializer(ShootPlanGrandchildSerializer):
    parent_field = 'reel'
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = ReelPhoto
        fields = ['id', 'reel', 'category', 'category_display', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']


class ReelSerializer(ShootPlanChildSerializer):
    platform_display = serializers.CharField(source='get_platform_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    photos = ReelPhotoSerializer(many=True, read_only=True, source='photos_gallery')
    assigned_model_names = serializers.SerializerMethodField()
    assigned_location_names = serializers.SerializerMethodField()
    assigned_prop_names = serializers.SerializerMethodField()

    class Meta:
        model = Reel
        fields = [
            'id', 'shoot_plan', 'order', 'title', 'concept', 'reference_link', 'notes',
            'photographer_notes', 'platform', 'platform_display', 'duration_seconds',
            'status', 'status_display', 'assigned_to',
            'assigned_models', 'assigned_model_names',
            'assigned_locations', 'assigned_location_names',
            'assigned_props', 'assigned_prop_names',
            'photos', 'department', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assigned_model_names(self, obj):
        return [m.name for m in obj.assigned_models.all()]

    def get_assigned_location_names(self, obj):
        return [l.name for l in obj.assigned_locations.all()]

    def get_assigned_prop_names(self, obj):
        return [p.name for p in obj.assigned_props.all()]


class PhotoBriefImageSerializer(ShootPlanGrandchildSerializer):
    parent_field = 'photo'
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = PhotoBriefImage
        fields = ['id', 'photo', 'category', 'category_display', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']


class PhotoReferenceLinkSerializer(ShootPlanGrandchildSerializer):
    parent_field = 'photo'
    class Meta:
        model = PhotoReferenceLink
        fields = ['id', 'photo', 'url', 'created_at']
        read_only_fields = ['id', 'created_at']


class PhotoSerializer(ShootPlanChildSerializer):
    shot_type_display = serializers.CharField(source='get_shot_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    photos = PhotoBriefImageSerializer(many=True, read_only=True, source='photos_gallery')
    reference_links = PhotoReferenceLinkSerializer(many=True, read_only=True)
    assigned_model_names = serializers.SerializerMethodField()
    assigned_location_names = serializers.SerializerMethodField()
    assigned_prop_names = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = [
            'id', 'shoot_plan', 'order', 'title', 'shot_type', 'shot_type_display',
            'quantity', 'description', 'notes_to_designer', 'status', 'status_display',
            'reference_link', 'reference_links', 'assigned_models', 'assigned_model_names',
            'assigned_locations', 'assigned_location_names',
            'assigned_props', 'assigned_prop_names',
            'photos', 'department', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_assigned_model_names(self, obj):
        return [m.name for m in obj.assigned_models.all()]

    def get_assigned_location_names(self, obj):
        return [l.name for l in obj.assigned_locations.all()]

    def get_assigned_prop_names(self, obj):
        return [p.name for p in obj.assigned_props.all()]


class TravelExpenseSerializer(ShootPlanChildSerializer):
    expense_type_display = serializers.CharField(source='get_expense_type_display', read_only=True)

    class Meta:
        model = TravelExpense
        fields = [
            'id', 'shoot_plan', 'reason', 'expense_type', 'expense_type_display',
            'cost', 'notes', 'department', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CrewMemberSerializer(ShootPlanChildSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    person_type_display = serializers.CharField(source='get_person_type_display', read_only=True)

    class Meta:
        model = CrewMember
        fields = [
            'id', 'shoot_plan', 'name', 'role', 'role_display', 'person_type', 'person_type_display',
            'contact', 'call_time', 'time_out', 'day_rate', 'notes',
            'source_freelancer', 'source_plan_model', 'source_brand_role',
            'meal_included', 'meal_cost', 'meals_count',
            'department', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BudgetItemSerializer(ShootPlanChildSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = BudgetItem
        fields = [
            'id', 'shoot_plan', 'category', 'category_display', 'description',
            'allocated_amount', 'spent_amount', 'remaining_amount',
            'department', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        allocated = attrs.get(
            'allocated_amount',
            getattr(self.instance, 'allocated_amount', 0),
        )
        spent = attrs.get('spent_amount', getattr(self.instance, 'spent_amount', 0))
        if allocated < 0 or spent < 0:
            raise serializers.ValidationError('Budget amounts cannot be negative.')
        return attrs


class ReviewApprovalSerializer(ShootPlanChildSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewer_name = serializers.CharField(source='reviewer.username', read_only=True, default=None)
    # `department` on ShootPlanChild is a plain property (delegates to the
    # parent plan), not a choices field, so there's no auto get_*_display().
    department_display = serializers.SerializerMethodField()

    class Meta:
        model = ReviewApproval
        fields = [
            'id', 'shoot_plan', 'status', 'status_display', 'remarks',
            'reviewer', 'reviewer_name', 'reviewed_at', 'department', 'department_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'reviewer', 'reviewer_name', 'reviewed_at', 'created_at', 'updated_at']

    def get_department_display(self, obj):
        return obj.shoot_plan.get_department_display()

    def create(self, validated_data):
        validated_data['reviewer'] = self.context['request'].user
        if validated_data.get('status') != ReviewApproval.Status.PENDING:
            validated_data['reviewed_at'] = timezone.now()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        new_status = validated_data.get('status', instance.status)
        if new_status != ReviewApproval.Status.PENDING and instance.reviewed_at is None:
            validated_data['reviewed_at'] = timezone.now()
        validated_data['reviewer'] = self.context['request'].user
        return super().update(instance, validated_data)


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username', read_only=True, default='System')
    department_display = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = ['id', 'shoot_plan', 'title', 'actor', 'actor_name', 'department_display', 'created_at']
        read_only_fields = fields

    def get_department_display(self, obj):
        return obj.shoot_plan.get_department_display() if obj.actor_id else 'System'


class FeedbackSerializer(serializers.ModelSerializer):
    """
    Feedback is stamped with the author and their department server-side, so a
    user cannot file feedback in another department's name.
    """

    author_name = serializers.CharField(source='author.username', read_only=True)
    author_email = serializers.CharField(source='author.email', read_only=True)
    department_display = serializers.CharField(source='get_department_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    shoot_plan_title = serializers.CharField(source='shoot_plan.title', read_only=True, default=None)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = Feedback
        fields = [
            'id', 'shoot_plan', 'shoot_plan_title', 'department', 'department_display',
            'author', 'author_name', 'author_email', 'subject', 'message',
            'category', 'category_display', 'rating', 'status', 'status_display',
            'admin_response', 'can_edit', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'department', 'author', 'author_name', 'author_email',
            'created_at', 'updated_at',
        ]

    def get_can_edit(self, obj):
        user = self.context['request'].user
        return user.is_elevated or obj.author_id == user.id

    def validate_subject(self, value):
        if not value.strip():
            raise serializers.ValidationError('Subject cannot be empty.')
        return value.strip()

    def validate_message(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError('Feedback message must be at least 5 characters.')
        return value.strip()

    def validate_shoot_plan(self, plan):
        if plan is None:
            return plan
        user = self.context['request'].user
        if not user.can_access_department(plan.department):
            raise serializers.ValidationError(
                'You cannot file feedback against another department\'s shoot plan.'
            )
        return plan

    def validate(self, attrs):
        user = self.context['request'].user
        # Only Admin may write an admin_response or move feedback out of OPEN
        # -- otherwise an author could close out their own complaint before
        # anyone reviews it.
        if not user.is_elevated and attrs.get('admin_response'):
            raise serializers.ValidationError(
                {'admin_response': 'Only Admin can write an admin response.'}
            )
        if not user.is_elevated and attrs.get('status', Feedback.Status.OPEN) != Feedback.Status.OPEN:
            raise serializers.ValidationError(
                {'status': 'Only Admin can change feedback status.'}
            )
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['author'] = user
        # Admin filing feedback on a plan inherits that plan's department so the
        # owning team can still see it; otherwise it lands in the author's own.
        plan = validated_data.get('shoot_plan')
        if user.is_elevated and plan is not None:
            validated_data['department'] = plan.department
        else:
            validated_data['department'] = user.department
        return super().create(validated_data)


# Human-readable Activity Timeline entries for a status transition, plus who
# gets notified (if anyone) -- mirrors the frontend's PRIMARY_ACTION map.
STATUS_TRANSITION_TITLES = {
    ('DRAFT', 'PRODUCTION_REVIEW'): 'Submitted for Production Review',
    ('RETURNED_FOR_CHANGES', 'PRODUCTION_REVIEW'): 'Resubmitted for Production Review',
    ('PRODUCTION_REVIEW', 'CREATIVE_REVIEW'): 'Approved by Production Head',
    ('CREATIVE_REVIEW', 'APPROVED'): 'Final approval granted',
    ('ON_HOLD', 'PRODUCTION_REVIEW'): 'Review resumed',
    ('APPROVED', 'SHOOT_COMPLETED'): 'Shoot marked completed',
    ('SHOOT_COMPLETED', 'ARCHIVED'): 'Shoot plan archived',
}
STATUS_TRANSITION_RECIPIENTS = {
    'PRODUCTION_REVIEW': 'Production Head',
    'CREATIVE_REVIEW': 'Creative Team',
    'APPROVED': 'Client Servicing',
}


def _log_status_transition(shoot_plan, old_status, new_status, actor):
    if old_status == new_status:
        return
    if new_status == 'ON_HOLD':
        title = 'Put on hold'
    elif new_status == 'RETURNED_FOR_CHANGES':
        title = 'Returned for changes'
    else:
        title = STATUS_TRANSITION_TITLES.get(
            (old_status, new_status), f'Status changed to {shoot_plan.get_status_display()}'
        )
    ActivityLog.objects.create(shoot_plan=shoot_plan, title=title, actor=actor)
    recipient = STATUS_TRANSITION_RECIPIENTS.get(new_status)
    if recipient:
        ActivityLog.objects.create(shoot_plan=shoot_plan, title=f'Notification sent to {recipient}', actor=None)


class ShootPlanListSerializer(serializers.ModelSerializer):
    """Lean payload for the shoot plan index table."""

    department_display = serializers.CharField(source='get_department_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True, default=None)
    brand_name = serializers.CharField(source='brand.name', read_only=True, default=None)
    brand_logo = serializers.ImageField(source='brand.logo', read_only=True, default=None)
    brand_palette = serializers.ImageField(source='brand.palette', read_only=True, default=None)
    brand_script_writer = serializers.CharField(source='brand.script_writer.name', read_only=True, default=None)
    brand_social_media_specialist = serializers.CharField(
        source='brand.social_media_specialist.name', read_only=True, default=None
    )
    brand_client_servicing = serializers.CharField(
        source='brand.client_servicing.name', read_only=True, default=None
    )
    brand_production_coordinator = serializers.CharField(
        source='brand.production_coordinator.name', read_only=True, default=None
    )
    brand_production_head = serializers.CharField(
        source='brand.production_head.name', read_only=True, default=None
    )
    reel_count = serializers.IntegerField(read_only=True)
    photo_count = serializers.IntegerField(read_only=True)
    crew_count = serializers.IntegerField(read_only=True)
    feedback_count = serializers.IntegerField(read_only=True)
    budget_allocated = serializers.SerializerMethodField()
    budget_spent = serializers.SerializerMethodField()
    latest_review_status = serializers.SerializerMethodField()
    completion_percent = serializers.SerializerMethodField()

    class Meta:
        model = ShootPlan
        fields = [
            'id', 'title', 'client_name', 'brand', 'brand_name', 'brand_logo', 'brand_palette',
            'brand_script_writer', 'brand_social_media_specialist',
            'brand_client_servicing', 'brand_production_coordinator', 'brand_production_head',
            'department', 'department_display',
            'status', 'status_display', 'completion_percent', 'location',
            'shoot_date', 'call_time', 'wrap_time', 'brief', 'created_by',
            'created_by_name', 'reel_count', 'photo_count', 'crew_count',
            'feedback_count', 'budget_allocated', 'budget_spent',
            'latest_review_status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_budget_allocated(self, obj):
        return float(sum(item.allocated_amount for item in obj.budget_items.all()))

    def get_budget_spent(self, obj):
        return float(sum(item.spent_amount for item in obj.budget_items.all()))

    def get_latest_review_status(self, obj):
        review = obj.reviews.all().first()
        return review.status if review else None

    def get_completion_percent(self, obj):
        """
        Derived from real progress instead of a stored value nothing ever
        updates -- mirrors the frontend wizard's own step-complete checks
        (ShootPlanWizard.js's stepComplete()) so the percentage shown on the
        Shoot Plans list always matches the sidebar checkmarks in the wizard.
        Uses the queryset's annotated *_count fields when available (list view,
        zero extra queries); falls back to a real count otherwise (e.g. the
        single instance returned right after create()).
        """
        def count(field):
            annotated = getattr(obj, f'{field}_count', None)
            return annotated if annotated is not None else getattr(obj, field).count()

        steps_done = sum([
            bool(obj.title and obj.shoot_date),
            count('reels') > 0,
            count('photos') > 0,
            count('crew') > 0,
            count('budget_items') > 0 or count('travel_expenses') > 0,
            count('feedback') > 0,
        ])
        return round(steps_done / 6 * 100)

    def validate_department(self, value):
        """A non-admin can only ever create plans inside their own department."""
        user = self.context['request'].user
        if not user.is_elevated and value != user.department:
            raise serializers.ValidationError(
                'You can only create shoot plans for your own department.'
            )
        if value not in Department.values:
            raise serializers.ValidationError('Select a valid department.')
        return value

    def _sync_client_name_from_brand(self, validated_data):
        """When a Brand is linked, client_name always mirrors it."""
        brand = validated_data.get('brand')
        if brand is not None:
            validated_data['client_name'] = brand.name

    def validate(self, attrs):
        """Every plan needs a display name -- either a linked Brand or a typed client_name."""
        brand = attrs.get('brand', getattr(self.instance, 'brand', None))
        client_name = attrs.get('client_name', getattr(self.instance, 'client_name', ''))
        if not brand and not client_name:
            raise serializers.ValidationError(
                {'client_name': 'Select a brand or enter a client/brand name.'}
            )
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        validated_data.setdefault('department', user.department)
        self._sync_client_name_from_brand(validated_data)
        instance = super().create(validated_data)
        ActivityLog.objects.create(shoot_plan=instance, title='Shoot plan created', actor=user)
        return instance

    def update(self, instance, validated_data):
        old_status = instance.status
        self._sync_client_name_from_brand(validated_data)
        instance = super().update(instance, validated_data)
        new_status = validated_data.get('status', old_status)
        _log_status_transition(instance, old_status, new_status, self.context['request'].user)
        return instance


class ShootPlanDetailSerializer(ShootPlanListSerializer):
    """Full payload -- every category nested, so the detail page is one request."""

    plan_models = PlanModelSerializer(many=True, read_only=True)
    plan_locations = PlanLocationSerializer(many=True, read_only=True)
    props = PropSerializer(many=True, read_only=True)
    reels = ReelSerializer(many=True, read_only=True)
    photos = PhotoSerializer(many=True, read_only=True)
    crew = CrewMemberSerializer(many=True, read_only=True)
    budget_items = BudgetItemSerializer(many=True, read_only=True)
    travel_expenses = TravelExpenseSerializer(many=True, read_only=True)
    reviews = ReviewApprovalSerializer(many=True, read_only=True)
    activity_log = ActivityLogSerializer(many=True, read_only=True)
    feedback = serializers.SerializerMethodField()

    class Meta(ShootPlanListSerializer.Meta):
        fields = ShootPlanListSerializer.Meta.fields + [
            'client_notified', 'models_notified', 'locations_notified',
            'plan_models', 'plan_locations', 'props',
            'reels', 'photos', 'crew', 'budget_items', 'travel_expenses', 'reviews', 'activity_log', 'feedback',
        ]

    def get_feedback(self, obj):
        user = self.context['request'].user
        queryset = obj.feedback.all()
        if not user.is_elevated:
            queryset = queryset.filter(department=user.department)
        return FeedbackSerializer(queryset, many=True, context=self.context).data
