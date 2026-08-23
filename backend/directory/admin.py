from django.contrib import admin

from .models import Brand, Freelancer, ModelProfile, TeamMember


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'designation', 'role', 'branch', 'is_active')
    list_filter = ('role', 'branch', 'is_active')
    search_fields = ('name', 'email', 'mobile')


@admin.register(Freelancer)
class FreelancerAdmin(admin.ModelAdmin):
    list_display = ('name', 'mobile', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'email', 'mobile')


@admin.register(ModelProfile)
class ModelProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'age', 'gender', 'cost_per_day', 'is_active')
    list_filter = ('gender', 'is_active')
    search_fields = ('name', 'email', 'mobile')


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'script_writer', 'social_media_specialist', 'client_servicing', 'production_head', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)
