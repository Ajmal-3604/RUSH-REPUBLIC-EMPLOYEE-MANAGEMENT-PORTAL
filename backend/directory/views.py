from django.db.models import Q
from rest_framework import viewsets

from users.permissions import IsAuthenticatedFullAccess

from .models import Brand, Freelancer, ModelProfile, TeamMember
from .serializers import BrandSerializer, FreelancerSerializer, ModelProfileSerializer, TeamMemberSerializer


def _status_filter(queryset, params):
    status_param = params.get('status')
    if status_param == 'Active':
        return queryset.filter(is_active=True)
    if status_param == 'Inactive':
        return queryset.filter(is_active=False)
    return queryset


class TeamMemberViewSet(viewsets.ModelViewSet):
    """/api/team/ -- internal Rush Republic staff directory."""

    serializer_class = TeamMemberSerializer
    permission_classes = [IsAuthenticatedFullAccess]

    def get_queryset(self):
        qs = TeamMember.objects.all()
        params = self.request.query_params
        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) | Q(email__icontains=search) | Q(mobile__icontains=search)
            )
        role = params.get('role')
        if role:
            qs = qs.filter(role=role)
        branch = params.get('branch')
        if branch:
            qs = qs.filter(branch=branch)
        return _status_filter(qs, params)


class FreelancerViewSet(viewsets.ModelViewSet):
    """/api/freelancers/ -- external photographers/videographers available for shoots."""

    serializer_class = FreelancerSerializer
    permission_classes = [IsAuthenticatedFullAccess]

    def get_queryset(self):
        qs = Freelancer.objects.all()
        params = self.request.query_params
        search = params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(mobile__icontains=search)
                | Q(equipment_summary__icontains=search)
            )
        category = params.get('category')
        if category:
            qs = qs.filter(categories__contains=[category])
        return _status_filter(qs, params)


class ModelProfileViewSet(viewsets.ModelViewSet):
    """/api/models/ -- master directory of talent available for shoots."""

    serializer_class = ModelProfileSerializer
    permission_classes = [IsAuthenticatedFullAccess]

    def get_queryset(self):
        qs = ModelProfile.objects.all()
        params = self.request.query_params
        search = params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(email__icontains=search) | Q(mobile__icontains=search))
        gender = params.get('gender')
        if gender:
            qs = qs.filter(gender=gender)
        category = params.get('category')
        if category:
            qs = qs.filter(categories__contains=[category])
        return _status_filter(qs, params)


class BrandViewSet(viewsets.ModelViewSet):
    """/api/brands/ -- client brands and their assigned Rush Republic team."""

    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticatedFullAccess]

    def get_queryset(self):
        qs = Brand.objects.select_related(
            'script_writer', 'social_media_specialist', 'client_servicing', 'production_head'
        )
        params = self.request.query_params
        search = params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search))
        return _status_filter(qs, params)
