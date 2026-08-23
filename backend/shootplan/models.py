from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

from users.models import Department
from rush_republic.image_utils import compress_image_field
from rush_republic.validators import validate_image_file_size


class TimeStampedModel(models.Model):
    """Adds created_at / updated_at to every record in this app."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class CompressedImageMixin(models.Model):
    """Compresses the `image` field on save -- shared by every per-plan photo gallery model."""

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        compress_image_field(self.image)
        super().save(*args, **kwargs)


class ShootPlan(TimeStampedModel):
    """
    The root record of the Shoot Plan module. Every other category
    (reels, photos, crew, budget, review, feedback) hangs off this.

    `department` is what scopes visibility: Admin sees every plan, other
    users only see plans belonging to their own department.
    """

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PRODUCTION_REVIEW = 'PRODUCTION_REVIEW', 'Production Review'
        ON_HOLD = 'ON_HOLD', 'On Hold'
        RETURNED_FOR_CHANGES = 'RETURNED_FOR_CHANGES', 'Returned for Changes'
        CREATIVE_REVIEW = 'CREATIVE_REVIEW', 'Creative Review'
        APPROVED = 'APPROVED', 'Approved'
        SHOOT_COMPLETED = 'SHOOT_COMPLETED', 'Shoot Completed'
        ARCHIVED = 'ARCHIVED', 'Archived'

    title = models.CharField(max_length=200)
    # Blank when created with a `brand` set -- the serializer mirrors
    # brand.name into this field so every plan still has a display name,
    # a walk-in client (no Brand record) just types it directly instead.
    client_name = models.CharField(max_length=200, blank=True)
    brand = models.ForeignKey(
        'directory.Brand', null=True, blank=True, on_delete=models.SET_NULL, related_name='shoot_plans'
    )
    department = models.CharField(max_length=30, choices=Department.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    completion_percent = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    brief = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    shoot_date = models.DateField(null=True, blank=True)
    call_time = models.TimeField(null=True, blank=True)
    wrap_time = models.TimeField(null=True, blank=True)

    # Step 1 (Shoot Details) notification toggles.
    client_notified = models.BooleanField(default=False)
    # Step 2 / Step 3 approval-panel notification toggles.
    models_notified = models.BooleanField(default=False)
    locations_notified = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='shoot_plans',
    )

    class Meta:
        ordering = ['-shoot_date', '-created_at']
        indexes = [models.Index(fields=['department', 'status'])]

    def __str__(self):
        return f'{self.title} - {self.client_name}'


class ShootPlanChild(TimeStampedModel):
    """
    Base for records owned by a ShootPlan.

    Exposes a `department` property so the shared IsAdminOrOwnDepartment
    object permission works uniformly across every model in this app.
    """

    class Meta:
        abstract = True

    @property
    def department(self):
        return self.shoot_plan.department


class ApprovalStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'


class PlanModel(ShootPlanChild):
    """
    A model/talent booking on a shoot plan (Step 2: People & Models).

    Either points at a directory.ModelProfile (`from_directory=True`) or is a
    one-off booking entered by hand -- the wizard supports both, matching the
    design reference's "Select from Models directory" vs. manually-added rows.
    """

    shoot_plan = models.ForeignKey(ShootPlan, on_delete=models.CASCADE, related_name='plan_models')
    order = models.PositiveIntegerField(default=0)

    from_directory = models.BooleanField(default=False)
    directory_model = models.ForeignKey(
        'directory.ModelProfile', null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )

    name = models.CharField(max_length=150)
    country_code = models.CharField(max_length=6, default='+91')
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    agency = models.CharField(max_length=150, blank=True)
    alt_contact = models.CharField(max_length=100, blank=True)
    negotiated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    time_in = models.TimeField(null=True, blank=True)
    time_out = models.TimeField(null=True, blank=True)
    approval_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name


class PlanModelPhoto(CompressedImageMixin):
    class Category(models.TextChoices):
        MODEL = 'MODEL', 'Model photo'
        COSTUME = 'COSTUME', 'Costume photo'
        COSTUME_COLOR_REF = 'COSTUME_COLOR_REF', 'Preferred costume color'

    plan_model = models.ForeignKey(PlanModel, on_delete=models.CASCADE, related_name='photos_gallery')
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.MODEL)
    image = models.ImageField(upload_to='shootplan/models/', validators=[validate_image_file_size])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class PermitStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    SECURED = 'SECURED', 'Secured'
    NOT_REQUIRED = 'NOT_REQUIRED', 'Not Required'


class PlanLocation(ShootPlanChild):
    """A shoot location (Step 3: Locations)."""

    shoot_plan = models.ForeignKey(ShootPlan, on_delete=models.CASCADE, related_name='plan_locations')
    order = models.PositiveIntegerField(default=0)

    name = models.CharField(max_length=200)
    address = models.CharField(max_length=500, blank=True)
    map_url = models.URLField(blank=True)
    permit_status = models.CharField(max_length=20, choices=PermitStatus.choices, default=PermitStatus.PENDING)
    contact_name = models.CharField(max_length=150, blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    access_notes = models.TextField(blank=True)
    time_in = models.TimeField(null=True, blank=True)
    time_out = models.TimeField(null=True, blank=True)
    approval_status = models.CharField(max_length=20, choices=ApprovalStatus.choices, default=ApprovalStatus.PENDING)
    budget_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='Location cost (₹)')

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name


class PlanLocationPhoto(CompressedImageMixin):
    class Category(models.TextChoices):
        LOCATION = 'LOCATION', 'Location photo'
        BACKGROUND_REF = 'BACKGROUND_REF', 'Preferred background'

    plan_location = models.ForeignKey(PlanLocation, on_delete=models.CASCADE, related_name='photos_gallery')
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.LOCATION)
    image = models.ImageField(upload_to='shootplan/locations/', validators=[validate_image_file_size])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class Prop(ShootPlanChild):
    """A prop needed for the shoot (Step 6: Props)."""

    class Source(models.TextChoices):
        LENT = 'LENT', 'Lent'
        RENTED = 'RENTED', 'Rented'
        OWNED = 'OWNED', 'Owned'

    class Status(models.TextChoices):
        SECURED = 'SECURED', 'Secured'
        NOT_SECURED = 'NOT_SECURED', 'Not Secured'

    shoot_plan = models.ForeignKey(ShootPlan, on_delete=models.CASCADE, related_name='props')
    order = models.PositiveIntegerField(default=0)
    name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    source = models.CharField(max_length=20, choices=Source.choices, blank=True)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_SECURED)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name

    @property
    def total_cost(self):
        return self.unit_cost * self.quantity


class PropPhoto(CompressedImageMixin):
    prop = models.ForeignKey(Prop, on_delete=models.CASCADE, related_name='photos_gallery')
    image = models.ImageField(upload_to='shootplan/props/', validators=[validate_image_file_size])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class TravelExpense(ShootPlanChild):
    """A single travel-budget line item (Step 8: Budget Allowance)."""

    class ExpenseType(models.TextChoices):
        AUTO = 'AUTO', 'Auto'
        CAB = 'CAB', 'Cab'
        CAR_RENTAL = 'CAR_RENTAL', 'Car rental'
        FUEL = 'FUEL', 'Fuel'
        FLIGHT = 'FLIGHT', 'Flight'
        TRAIN = 'TRAIN', 'Train'
        BUS = 'BUS', 'Bus'
        ACCOMMODATION = 'ACCOMMODATION', 'Accommodation'
        PARKING = 'PARKING', 'Parking'
        TOLL = 'TOLL', 'Toll'
        OTHER = 'OTHER', 'Other'

    shoot_plan = models.ForeignKey(ShootPlan, on_delete=models.CASCADE, related_name='travel_expenses')
    reason = models.CharField(max_length=200, blank=True)
    expense_type = models.CharField(max_length=20, choices=ExpenseType.choices, default=ExpenseType.OTHER)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.reason or self.get_expense_type_display()


class Reel(ShootPlanChild):
    """A single reel/video deliverable inside a shoot plan."""

    class Platform(models.TextChoices):
        INSTAGRAM = 'INSTAGRAM', 'Instagram'
        YOUTUBE = 'YOUTUBE', 'YouTube Shorts'
        TIKTOK = 'TIKTOK', 'TikTok'
        LINKEDIN = 'LINKEDIN', 'LinkedIn'
        FACEBOOK = 'FACEBOOK', 'Facebook'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        IDEA = 'IDEA', 'Idea'
        SCRIPTED = 'SCRIPTED', 'Scripted'
        SHOT = 'SHOT', 'Shot'
        EDITING = 'EDITING', 'Editing'
        PUBLISHED = 'PUBLISHED', 'Published'

    shoot_plan = models.ForeignKey(ShootPlan, on_delete=models.CASCADE, related_name='reels')
    order = models.PositiveIntegerField(default=0)
    title = models.CharField(max_length=200, blank=True)
    concept = models.TextField(blank=True, verbose_name='Script')
    reference_link = models.URLField(blank=True)
    notes = models.TextField(blank=True, verbose_name='Notes to editor')
    photographer_notes = models.TextField(blank=True)
    platform = models.CharField(max_length=20, choices=Platform.choices, default=Platform.INSTAGRAM)
    duration_seconds = models.PositiveIntegerField(default=30)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IDEA)
    assigned_to = models.CharField(max_length=150, blank=True)

    assigned_models = models.ManyToManyField('PlanModel', blank=True, related_name='reels')
    assigned_locations = models.ManyToManyField('PlanLocation', blank=True, related_name='reels')
    assigned_props = models.ManyToManyField('Prop', blank=True, related_name='reels')

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return f'Reel: {self.title}'


class ReelPhoto(CompressedImageMixin):
    """A 9:16 reference frame attached to a Reel -- storyboard, wardrobe, or background."""

    class Category(models.TextChoices):
        STORYBOARD = 'STORYBOARD', 'Storyboard'
        WARDROBE = 'WARDROBE', 'Wardrobe reference'
        BACKGROUND = 'BACKGROUND', 'Background reference'

    reel = models.ForeignKey(Reel, on_delete=models.CASCADE, related_name='photos_gallery')
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.STORYBOARD)
    image = models.ImageField(upload_to='shootplan/reels/', validators=[validate_image_file_size])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class Photo(ShootPlanChild):
    """A photo deliverable / shot-list entry inside a shoot plan."""

    class ShotType(models.TextChoices):
        PORTRAIT = 'PORTRAIT', 'Portrait'
        PRODUCT = 'PRODUCT', 'Product'
        LIFESTYLE = 'LIFESTYLE', 'Lifestyle'
        CANDID = 'CANDID', 'Candid'
        GROUP = 'GROUP', 'Group'
        BTS = 'BTS', 'Behind The Scenes'
        OTHER = 'OTHER', 'Other'

    class Status(models.TextChoices):
        PLANNED = 'PLANNED', 'Planned'
        SHOT = 'SHOT', 'Shot'
        RETOUCHING = 'RETOUCHING', 'Retouching'
        DELIVERED = 'DELIVERED', 'Delivered'

    shoot_plan = models.ForeignKey(ShootPlan, on_delete=models.CASCADE, related_name='photos')
    order = models.PositiveIntegerField(default=0)
    title = models.CharField(max_length=200, blank=True)
    shot_type = models.CharField(max_length=20, choices=ShotType.choices, default=ShotType.PRODUCT)
    quantity = models.PositiveIntegerField(default=1)
    description = models.TextField(blank=True, verbose_name='Shot description')
    notes_to_designer = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNED)
    reference_link = models.URLField(blank=True)

    assigned_models = models.ManyToManyField('PlanModel', blank=True, related_name='photo_briefs')
    assigned_locations = models.ManyToManyField('PlanLocation', blank=True, related_name='photo_briefs')
    assigned_props = models.ManyToManyField('Prop', blank=True, related_name='photo_briefs')

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return f'Photo: {self.title}'


class PhotoBriefImage(CompressedImageMixin):
    """A 9:16 reference frame attached to a Photo brief -- moodboard, wardrobe, or background."""

    class Category(models.TextChoices):
        MOODBOARD = 'MOODBOARD', 'Moodboard'
        WARDROBE = 'WARDROBE', 'Wardrobe reference'
        BACKGROUND = 'BACKGROUND', 'Background reference'

    photo = models.ForeignKey(Photo, on_delete=models.CASCADE, related_name='photos_gallery')
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.MOODBOARD)
    image = models.ImageField(upload_to='shootplan/photo-briefs/', validators=[validate_image_file_size])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class PhotoReferenceLink(models.Model):
    """One of possibly several reference links attached to a Photo brief."""

    photo = models.ForeignKey(Photo, on_delete=models.CASCADE, related_name='reference_links')
    url = models.URLField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.url


class CrewMember(ShootPlanChild):
    """A person on the shoot crew, with their call time and day rate."""

    class Role(models.TextChoices):
        DIRECTOR = 'DIRECTOR', 'Director'
        DOP = 'DOP', 'Director of Photography'
        CAMERA = 'CAMERA', 'Camera Operator'
        PHOTOGRAPHER = 'PHOTOGRAPHER', 'Photographer'
        EDITOR = 'EDITOR', 'Editor'
        STYLIST = 'STYLIST', 'Stylist'
        MAKEUP = 'MAKEUP', 'Hair & Makeup'
        PRODUCTION_ASSISTANT = 'PRODUCTION_ASSISTANT', 'Production Assistant'
        SCRIPT_WRITER = 'SCRIPT_WRITER', 'Script Writer'
        SOCIAL_MEDIA_SPECIALIST = 'SOCIAL_MEDIA_SPECIALIST', 'Social Media Specialist'
        CLIENT_SERVICING = 'CLIENT_SERVICING', 'Client Servicing'
        PRODUCTION_COORDINATOR = 'PRODUCTION_COORDINATOR', 'Production Coordinator'
        PRODUCTION_HEAD = 'PRODUCTION_HEAD', 'Production Head'
        TALENT = 'TALENT', 'Talent'
        OTHER = 'OTHER', 'Other'

    class PersonType(models.TextChoices):
        INTERNAL_TEAM = 'INTERNAL_TEAM', 'Internal Team'
        FREELANCER = 'FREELANCER', 'Freelancer'
        MODEL = 'MODEL', 'Model'

    shoot_plan = models.ForeignKey(ShootPlan, on_delete=models.CASCADE, related_name='crew')
    name = models.CharField(max_length=150)
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.OTHER)
    person_type = models.CharField(max_length=20, choices=PersonType.choices, default=PersonType.INTERNAL_TEAM)
    contact = models.CharField(max_length=30, blank=True)
    call_time = models.TimeField(null=True, blank=True, verbose_name='Agreed time in')
    time_out = models.TimeField(null=True, blank=True, verbose_name='Agreed time out')
    day_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    # Where this row was synced from, if not added manually -- lets "Sync from
    # shoot plan" re-run without duplicating rows.
    source_freelancer = models.ForeignKey(
        'directory.Freelancer', null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    source_plan_model = models.ForeignKey(
        'PlanModel', null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    # Which brand contact role (Script Writer, Social Media Specialist, ...) this row
    # was synced from, if any -- lets "Sync from shoot plan" re-run without duplicating.
    source_brand_role = models.CharField(max_length=30, choices=Role.choices, blank=True)

    # Step 8 (Budget Allowance) food-budget inputs.
    meal_included = models.BooleanField(default=True)
    meal_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    meals_count = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ['call_time', 'name']

    def __str__(self):
        return f'{self.name} - {self.get_role_display()}'


class BudgetItem(ShootPlanChild):
    """A single line in the shoot's budget allowance."""

    class Category(models.TextChoices):
        CREW = 'CREW', 'Crew'
        EQUIPMENT = 'EQUIPMENT', 'Equipment'
        LOCATION = 'LOCATION', 'Location'
        TRAVEL = 'TRAVEL', 'Travel'
        CATERING = 'CATERING', 'Catering'
        PROPS = 'PROPS', 'Props & Set'
        POST_PRODUCTION = 'POST_PRODUCTION', 'Post Production'
        CONTINGENCY = 'CONTINGENCY', 'Contingency'
        OTHER = 'OTHER', 'Other'

    shoot_plan = models.ForeignKey(ShootPlan, on_delete=models.CASCADE, related_name='budget_items')
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    description = models.CharField(max_length=255, blank=True)
    allocated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    spent_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ['category']

    @property
    def remaining_amount(self):
        return self.allocated_amount - self.spent_amount

    def __str__(self):
        return f'{self.get_category_display()} - {self.allocated_amount}'


class ReviewApproval(ShootPlanChild):
    """A review round on a shoot plan, ending in approval or rejection."""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        CHANGES_REQUESTED = 'CHANGES_REQUESTED', 'Changes Requested'

    shoot_plan = models.ForeignKey(ShootPlan, on_delete=models.CASCADE, related_name='reviews')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    remarks = models.TextField(blank=True)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reviews',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Review of {self.shoot_plan_id} - {self.get_status_display()}'


class ActivityLog(models.Model):
    """
    A human-readable event on a shoot plan's timeline (created, submitted,
    notification sent, ...) -- separate from ReviewApproval, which only
    tracks approval decisions and their remarks.
    """

    shoot_plan = models.ForeignKey(ShootPlan, on_delete=models.CASCADE, related_name='activity_log')
    title = models.CharField(max_length=200)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.shoot_plan_id})'


class Feedback(TimeStampedModel):
    """
    Standalone feedback record, optionally attached to a shoot plan.

    `department` is stamped from the author on create so non-admin users can be
    restricted to their own department's feedback without a join.
    """

    class Category(models.TextChoices):
        GENERAL = 'GENERAL', 'General'
        SHOOT = 'SHOOT', 'Shoot Execution'
        CLIENT = 'CLIENT', 'Client'
        CREW = 'CREW', 'Crew'
        BUDGET = 'BUDGET', 'Budget'
        SCRIPT = 'SCRIPT', 'Script'
        TOOLING = 'TOOLING', 'Tooling / Portal'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        IN_REVIEW = 'IN_REVIEW', 'In Review'
        RESOLVED = 'RESOLVED', 'Resolved'
        CLOSED = 'CLOSED', 'Closed'

    shoot_plan = models.ForeignKey(
        ShootPlan,
        on_delete=models.CASCADE,
        related_name='feedback',
        null=True,
        blank=True,
    )
    department = models.CharField(max_length=30, choices=Department.choices)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feedback',
    )
    subject = models.CharField(max_length=200)
    message = models.TextField()
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.GENERAL)
    rating = models.PositiveSmallIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    admin_response = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['department', 'status'])]
        verbose_name_plural = 'feedback'

    def __str__(self):
        return f'{self.subject} ({self.get_department_display()})'
