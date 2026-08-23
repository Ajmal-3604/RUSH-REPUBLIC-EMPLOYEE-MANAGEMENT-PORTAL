from django.contrib import admin

from .models import (
    ShootPlan,
    PlanModel,
    PlanLocation,
    Prop,
    Reel,
    Photo,
    TravelExpense,
    CrewMember,
    BudgetItem,
    ReviewApproval,
    Feedback,
)


class ReelInline(admin.TabularInline):
    model = Reel
    extra = 0


class PhotoInline(admin.TabularInline):
    model = Photo
    extra = 0


class CrewMemberInline(admin.TabularInline):
    model = CrewMember
    extra = 0


class BudgetItemInline(admin.TabularInline):
    model = BudgetItem
    extra = 0


class ReviewApprovalInline(admin.TabularInline):
    model = ReviewApproval
    extra = 0


@admin.register(ShootPlan)
class ShootPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'client_name', 'department', 'status', 'completion_percent', 'shoot_date', 'created_by')
    list_filter = ('department', 'status', 'shoot_date')
    search_fields = ('title', 'client_name', 'location')
    date_hierarchy = 'created_at'
    inlines = [ReelInline, PhotoInline, CrewMemberInline, BudgetItemInline, ReviewApprovalInline]


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ('subject', 'department', 'author', 'category', 'rating', 'status', 'created_at')
    list_filter = ('department', 'category', 'status', 'rating')
    search_fields = ('subject', 'message', 'author__username', 'author__email')
    date_hierarchy = 'created_at'


@admin.register(Reel)
class ReelAdmin(admin.ModelAdmin):
    list_display = ('title', 'shoot_plan', 'platform', 'status', 'assigned_to')
    list_filter = ('platform', 'status')
    search_fields = ('title', 'concept')


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ('title', 'shoot_plan', 'shot_type', 'quantity', 'status')
    list_filter = ('shot_type', 'status')
    search_fields = ('title', 'description')


@admin.register(CrewMember)
class CrewMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'shoot_plan', 'role', 'call_time', 'day_rate')
    list_filter = ('role',)
    search_fields = ('name', 'contact')


@admin.register(BudgetItem)
class BudgetItemAdmin(admin.ModelAdmin):
    list_display = ('category', 'shoot_plan', 'allocated_amount', 'spent_amount')
    list_filter = ('category',)


@admin.register(ReviewApproval)
class ReviewApprovalAdmin(admin.ModelAdmin):
    list_display = ('shoot_plan', 'status', 'reviewer', 'reviewed_at')
    list_filter = ('status',)


@admin.register(PlanModel)
class PlanModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'shoot_plan', 'from_directory', 'approval_status', 'time_in', 'time_out')
    list_filter = ('approval_status', 'from_directory')
    search_fields = ('name', 'email', 'phone')


@admin.register(PlanLocation)
class PlanLocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'shoot_plan', 'permit_status', 'approval_status', 'budget_cost')
    list_filter = ('permit_status', 'approval_status')
    search_fields = ('name', 'address')


@admin.register(Prop)
class PropAdmin(admin.ModelAdmin):
    list_display = ('name', 'shoot_plan', 'quantity', 'unit_cost', 'status')
    list_filter = ('status', 'source')
    search_fields = ('name',)


@admin.register(TravelExpense)
class TravelExpenseAdmin(admin.ModelAdmin):
    list_display = ('reason', 'shoot_plan', 'expense_type', 'cost')
    list_filter = ('expense_type',)
