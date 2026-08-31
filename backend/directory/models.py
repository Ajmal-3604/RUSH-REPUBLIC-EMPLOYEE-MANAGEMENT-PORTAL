from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

from rush_republic.image_utils import compress_image_field
from rush_republic.validators import validate_image_file_size


class TeamRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    PRODUCTION_HEAD = 'PRODUCTION_HEAD', 'Production Head'
    SOCIAL_MEDIA_SPECIALIST = 'SOCIAL_MEDIA_SPECIALIST', 'Social Media Specialist'
    CLIENT_SERVICING = 'CLIENT_SERVICING', 'Client Servicing'
    SCRIPT_WRITER = 'SCRIPT_WRITER', 'Script Writer'
    PRODUCTION_COORDINATOR = 'PRODUCTION_COORDINATOR', 'Production Coordinator'


class Branch(models.TextChoices):
    KOCHI = 'KOCHI', 'Kochi'
    COIMBATORE = 'COIMBATORE', 'Coimbatore'


class TeamMember(models.Model):
    """Internal Rush Republic staff profile (distinct from login accounts)."""

    name = models.CharField(max_length=150)
    designation = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=30, choices=TeamRole.choices)
    branch = models.CharField(max_length=20, choices=Branch.choices, default=Branch.KOCHI)
    mobile = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class FreelancerCategory(models.TextChoices):
    PHOTOGRAPHER = 'PHOTOGRAPHER', 'Photographer'
    VIDEOGRAPHER = 'VIDEOGRAPHER', 'Videographer'
    CINEMATOGRAPHER = 'CINEMATOGRAPHER', 'Cinematographer'
    PRODUCTION_COORDINATOR = 'PRODUCTION_COORDINATOR', 'Production Coordinator'
    SCRIPT_WRITER = 'SCRIPT_WRITER', 'Script Writer'
    CAMERA_ASSISTANT = 'CAMERA_ASSISTANT', 'Camera Assistant'
    PRODUCTION_HEAD = 'PRODUCTION_HEAD', 'Production Head'


class Freelancer(models.Model):
    """External photographer/videographer/crew available for shoots."""

    name = models.CharField(max_length=150)
    mobile = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    categories = models.JSONField(default=list, blank=True)
    specialization = models.CharField(max_length=200, blank=True)
    # Structured list of {"type": "Camera", "name": "Sony A7 IV"} rows,
    # editable in the drawer. `equipment_summary` is legacy flat text kept
    # for older records and shown on the card as a fallback.
    equipment = models.JSONField(default=list, blank=True)
    equipment_summary = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    availability_note = models.CharField(max_length=200, blank=True, default='No upcoming bookings')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ModelGender(models.TextChoices):
    MALE = 'MALE', 'Male'
    FEMALE = 'FEMALE', 'Female'
    OTHER = 'OTHER', 'Other'


class ModelCategory(models.TextChoices):
    MODELLING = 'MODELLING', 'Modelling'
    ACTING = 'ACTING', 'Acting'


class ModelProfile(models.Model):
    """Master directory of talent (models/actors) available for shoots."""

    name = models.CharField(max_length=150)
    mobile = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    age = models.PositiveSmallIntegerField(validators=[MinValueValidator(18), MaxValueValidator(80)])
    gender = models.CharField(max_length=10, choices=ModelGender.choices, default=ModelGender.OTHER)
    height_cm = models.PositiveSmallIntegerField(null=True, blank=True)
    weight_kg = models.PositiveSmallIntegerField(null=True, blank=True)
    skin_tone = models.CharField(max_length=50, blank=True)
    categories = models.JSONField(default=list, blank=True)
    cost_per_day = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    photo = models.ImageField(upload_to='models/', null=True, blank=True, validators=[validate_image_file_size])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        compress_image_field(self.photo)
        super().save(*args, **kwargs)


class Brand(models.Model):
    """Client brand and the Rush Republic team assigned to it."""

    name = models.CharField(max_length=150)
    logo = models.ImageField(upload_to='brands/', null=True, blank=True, validators=[validate_image_file_size])
    palette = models.ImageField(
        upload_to='brands/palettes/', null=True, blank=True, validators=[validate_image_file_size]
    )
    is_active = models.BooleanField(default=True)

    script_writer = models.ForeignKey(
        TeamMember, null=True, blank=True, on_delete=models.SET_NULL, related_name='brands_as_script_writer'
    )
    social_media_specialist = models.ForeignKey(
        TeamMember, null=True, blank=True, on_delete=models.SET_NULL, related_name='brands_as_social_media'
    )
    client_servicing = models.ForeignKey(
        TeamMember, null=True, blank=True, on_delete=models.SET_NULL, related_name='brands_as_client_servicing'
    )
    production_coordinator = models.ForeignKey(
        TeamMember, null=True, blank=True, on_delete=models.SET_NULL, related_name='brands_as_production_coordinator'
    )
    production_head = models.ForeignKey(
        TeamMember, null=True, blank=True, on_delete=models.SET_NULL, related_name='brands_as_production_head'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        compress_image_field(self.logo)
        compress_image_field(self.palette)
        super().save(*args, **kwargs)
