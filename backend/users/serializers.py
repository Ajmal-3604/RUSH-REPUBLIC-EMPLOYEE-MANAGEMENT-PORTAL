import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CustomUser, Department

CONTACT_RE = re.compile(r'^\+?\d{10,15}$')
SPECIAL_RE = re.compile(r'[!@#$%^&*(),.?":{}|<>_\-\[\];\'\\/`~+=]')


def enforce_strong_password(value):
    """Shared strong-password policy used by signup and admin-side user creation."""
    if len(value) < 8:
        raise serializers.ValidationError('Password must be at least 8 characters long.')
    if not re.search(r'[A-Z]', value):
        raise serializers.ValidationError('Password must contain at least one uppercase letter.')
    if not re.search(r'[a-z]', value):
        raise serializers.ValidationError('Password must contain at least one lowercase letter.')
    if not re.search(r'\d', value):
        raise serializers.ValidationError('Password must contain at least one number.')
    if not SPECIAL_RE.search(value):
        raise serializers.ValidationError('Password must contain at least one special character.')
    validate_password(value)
    return value


class UserSerializer(serializers.ModelSerializer):
    """Read-only serializer for returning user/profile data to the client."""

    department_display = serializers.CharField(source='get_department_display', read_only=True)
    is_admin = serializers.BooleanField(read_only=True)
    is_production_head = serializers.BooleanField(read_only=True)
    is_elevated = serializers.BooleanField(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'contact',
            'department', 'department_display', 'is_admin', 'is_production_head', 'is_elevated',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class SignupSerializer(serializers.ModelSerializer):
    """Handles new employee registration with full validation."""

    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'contact', 'password',
            'confirm_password', 'department',
        ]

    def validate_email(self, value):
        if CustomUser.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_username(self, value):
        if CustomUser.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def validate_contact(self, value):
        if not CONTACT_RE.match(value):
            raise serializers.ValidationError(
                'Enter a valid contact number (10-15 digits, optional leading +).'
            )
        return value

    def validate_department(self, value):
        if value not in Department.values:
            raise serializers.ValidationError('Select a valid department.')
        return value

    def validate_password(self, value):
        return enforce_strong_password(value)

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({'confirm_password': "Passwords don't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        return CustomUser.objects.create_user(password=password, **validated_data)


class AdminUserWriteSerializer(serializers.ModelSerializer):
    """
    Admin-only user management (create / update / deactivate).

    Password is optional on update -- omit it to leave the existing one intact.
    """

    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    department_display = serializers.CharField(source='get_department_display', read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'contact', 'department',
            'department_display', 'is_active', 'password',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'department_display']

    def validate_contact(self, value):
        if not CONTACT_RE.match(value):
            raise serializers.ValidationError(
                'Enter a valid contact number (10-15 digits, optional leading +).'
            )
        return value

    def validate_password(self, value):
        return enforce_strong_password(value)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'Password is required when creating a user.'})
        return CustomUser.objects.create_user(password=password, **validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Login serializer using email + password instead of username + password,
    and embeds department/user info directly in the JWT + response payload.
    """

    username_field = CustomUser.USERNAME_FIELD

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['department'] = user.department
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
