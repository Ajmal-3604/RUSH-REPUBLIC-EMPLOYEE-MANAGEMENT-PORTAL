import json

from rest_framework import serializers

from .models import Brand, Freelancer, ModelProfile, TeamMember, TeamRole


def _parse_categories(value):
    """
    `categories` is a JSONField (a real list) for JSON requests, but a
    multipart form (needed for the photo upload) can only send strings --
    the frontend JSON-encodes the list into a single field in that case, so
    accept both shapes here instead of only the JSON-request one.
    """
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            raise serializers.ValidationError('categories must be a list.')
    if not isinstance(value, list):
        raise serializers.ValidationError('categories must be a list.')
    return value


class TeamMemberSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    branch_display = serializers.CharField(source='get_branch_display', read_only=True)

    class Meta:
        model = TeamMember
        fields = [
            'id', 'name', 'designation', 'role', 'role_display', 'branch', 'branch_display',
            'mobile', 'email', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class FreelancerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Freelancer
        fields = [
            'id', 'name', 'mobile', 'email', 'categories', 'specialization',
            'equipment', 'equipment_summary', 'notes', 'availability_note',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_categories(self, value):
        return _parse_categories(value)

    def validate_equipment(self, value):
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except ValueError:
                raise serializers.ValidationError('equipment must be a list.')
        if not isinstance(value, list):
            raise serializers.ValidationError('equipment must be a list.')
        return value


class ModelProfileSerializer(serializers.ModelSerializer):
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)

    class Meta:
        model = ModelProfile
        fields = [
            'id', 'name', 'mobile', 'email', 'age', 'gender', 'gender_display', 'height_cm', 'weight_kg', 'skin_tone',
            'categories', 'cost_per_day', 'notes', 'photo', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_categories(self, value):
        return _parse_categories(value)


class BrandSerializer(serializers.ModelSerializer):
    script_writer_name = serializers.CharField(source='script_writer.name', read_only=True, default=None)
    social_media_specialist_name = serializers.CharField(
        source='social_media_specialist.name', read_only=True, default=None
    )
    client_servicing_name = serializers.CharField(source='client_servicing.name', read_only=True, default=None)
    production_coordinator_name = serializers.CharField(
        source='production_coordinator.name', read_only=True, default=None
    )
    production_head_name = serializers.CharField(source='production_head.name', read_only=True, default=None)

    class Meta:
        model = Brand
        fields = [
            'id', 'name', 'logo', 'palette', 'is_active',
            'script_writer', 'script_writer_name',
            'social_media_specialist', 'social_media_specialist_name',
            'client_servicing', 'client_servicing_name',
            'production_coordinator', 'production_coordinator_name',
            'production_head', 'production_head_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    # Each of these five roles must be filled by a TeamMember actually
    # holding that role -- the frontend already filters the dropdowns to
    # match, but the API is the real gate since it can be hit directly.
    def _validate_role(self, value, required_role, field_label):
        if value is not None and value.role != required_role:
            raise serializers.ValidationError(f'Selected user is not in the {field_label} role.')
        return value

    def validate_client_servicing(self, value):
        return self._validate_role(value, TeamRole.CLIENT_SERVICING, 'Client Servicing')

    def validate_social_media_specialist(self, value):
        return self._validate_role(value, TeamRole.SOCIAL_MEDIA_SPECIALIST, 'Social Media Specialist')

    def validate_production_coordinator(self, value):
        return self._validate_role(value, TeamRole.PRODUCTION_COORDINATOR, 'Production Coordinator')

    def validate_script_writer(self, value):
        return self._validate_role(value, TeamRole.SCRIPT_WRITER, 'Script Writer')

    def validate_production_head(self, value):
        return self._validate_role(value, TeamRole.PRODUCTION_HEAD, 'Production Head')
