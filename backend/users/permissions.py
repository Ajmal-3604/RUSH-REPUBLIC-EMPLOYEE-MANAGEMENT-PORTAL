from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Department


def _in(request, *departments):
    """True when the authenticated user belongs to one of `departments`."""
    user = request.user
    return bool(user and user.is_authenticated and user.department in departments)


class IsAdmin(BasePermission):
    """Allows access only to users in the Admin department."""

    message = 'Only Admin department users can access this resource.'

    def has_permission(self, request, view):
        return _in(request, Department.ADMIN)


class IsElevated(BasePermission):
    """
    Allows access to Admin and Production Head -- the two roles with
    "full access except Admin['s own account-management area]" per the RBAC
    spec. Everything both roles may reach (Shoot Plans across every
    department, the Brands/Team/Freelancers/Models directory) uses this;
    Employee/user-account management stays gated to IsAdmin specifically.
    """

    message = 'Only Admin or Production Head can access this resource.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_elevated)


class IsSocialMedia(BasePermission):
    """Allows access to Social Media users (Admin also has full access)."""

    message = 'Only Social Media department users can access this resource.'

    def has_permission(self, request, view):
        return _in(request, Department.SOCIAL_MEDIA, Department.ADMIN)


class IsProductionCoordinator(BasePermission):
    """Allows access to Production Co-Ordinator users (Admin also has full access)."""

    message = 'Only Production Co-Ordinator department users can access this resource.'

    def has_permission(self, request, view):
        return _in(request, Department.PRODUCTION_COORDINATOR, Department.ADMIN)


class IsClientServicing(BasePermission):
    """Allows access to Client-Servicing users (Admin also has full access)."""

    message = 'Only Client-Servicing department users can access this resource.'

    def has_permission(self, request, view):
        return _in(request, Department.CLIENT_SERVICING, Department.ADMIN)


class IsScriptWriter(BasePermission):
    """Allows access to Script Writer users (Admin also has full access)."""

    message = 'Only Script Writer department users can access this resource.'

    def has_permission(self, request, view):
        return _in(request, Department.SCRIPT_WRITER, Department.ADMIN)


class IsAdminOrReadOnly(BasePermission):
    """Any authenticated user may read; only Admin or Production Head may write."""

    message = 'Only Admin or Production Head can modify this resource.'

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_elevated


class IsAdminOrOwnDepartment(BasePermission):
    """
    Object-level guard for department-scoped records.

    Admin and Production Head may read and write anything. Every other user
    may only touch rows whose `department` matches their own. This is the
    backend half of the "cannot access any other department" rule -- the
    frontend route guard is convenience, this is the enforcement.
    """

    message = 'You can only access records belonging to your own department.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.is_elevated:
            return True
        return getattr(obj, 'department', None) == request.user.department
