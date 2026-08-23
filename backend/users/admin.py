from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('username', 'email', 'department', 'contact', 'is_staff', 'created_at')
    list_filter = ('department', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'contact')
    ordering = ('-created_at',)

    fieldsets = (
        (None, {'fields': ('username', 'email', 'password')}),
        ('Employee info', {'fields': ('contact', 'department')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'contact', 'department', 'password1', 'password2'),
        }),
    )
    readonly_fields = ('created_at', 'updated_at')
