"""
Seeds Team, Freelancer, Model, and Brand demo rows matching the design
reference exactly, so Brands/Team/Freelancers/Models are walkable straight
after `migrate`.

    python manage.py seed_directory

Idempotent: matched by name, re-running updates rather than duplicates.
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from directory.models import Brand, Freelancer, ModelProfile, TeamMember


class Command(BaseCommand):
    help = 'Creates demo Team, Freelancer, Model, and Brand rows.'

    @transaction.atomic
    def handle(self, *args, **options):
        team_rows = [
            ('Ananth Krishnan', 'Founder', 'ADMIN', 'KOCHI', '98470 11111', 'ananth@rushrepublic.in', True),
            ('Karthik Suresh', 'Production Head', 'PRODUCTION_HEAD', 'KOCHI', '98470 33333', 'karthik@rushrepublic.in', True),
            ('Aakash Menon', 'Social Media Lead', 'SOCIAL_MEDIA_SPECIALIST', 'KOCHI', '98470 44444', 'aakash@rushrepublic.in', True),
            ('Srindhi Pillai', 'Senior Account Executive', 'CLIENT_SERVICING', 'KOCHI', '98470 55555', 'srindhi@rushrepublic.in', True),
            ('Devika Nair', 'Script Writer', 'SCRIPT_WRITER', 'COIMBATORE', '98470 66666', 'devika@rushrepublic.in', True),
            ('Farhan Ali', 'Production Coordinator', 'PRODUCTION_COORDINATOR', 'COIMBATORE', '98470 77777', 'farhan@rushrepublic.in', False),
        ]
        members = {}
        for name, designation, role, branch, mobile, email, is_active in team_rows:
            tm, _ = TeamMember.objects.update_or_create(
                name=name,
                defaults={
                    'designation': designation, 'role': role, 'branch': branch,
                    'mobile': mobile, 'email': email, 'is_active': is_active,
                },
            )
            members[name] = tm
        self.stdout.write(self.style.SUCCESS(f'{len(team_rows)} team members ready'))

        brand_rows = [
            ('Indriya Realtors', True),
            ('Novara Living', True),
            ('Kochi Marina', True),
            ('Lumen Interiors', True),
        ]
        for name, is_active in brand_rows:
            Brand.objects.update_or_create(
                name=name,
                defaults={
                    'is_active': is_active,
                    'script_writer': members['Devika Nair'],
                    'social_media_specialist': members['Aakash Menon'],
                    'client_servicing': members['Srindhi Pillai'],
                    'production_coordinator': members['Farhan Ali'],
                    'production_head': members['Karthik Suresh'],
                },
            )
        self.stdout.write(self.style.SUCCESS(f'{len(brand_rows)} brands ready'))

        freelancer_rows = [
            ('Rahul Menon', '98470 88888', 'rahul@freelance.in', ['PHOTOGRAPHER'], '', '2 cameras · 3 lens', True),
            ('Sneha George', '98470 99999', 'sneha@freelance.in', ['VIDEOGRAPHER'], 'Drone Operator', '1 camera · 1 gimbal', True),
            ('Vishnu Prasad', '98470 10101', 'vishnu@freelance.in', ['VIDEOGRAPHER'], 'Cinematographer (Both)', 'Lights with stand · 1 microphone', True),
            ('Anjali Raj', '99887 76655', 'anjali@freelance.in', ['PHOTOGRAPHER'], '', 'No equipment listed', False),
        ]
        for name, mobile, email, categories, specialization, equipment, is_active in freelancer_rows:
            Freelancer.objects.update_or_create(
                name=name,
                defaults={
                    'mobile': mobile, 'email': email, 'categories': categories,
                    'specialization': specialization, 'equipment_summary': equipment,
                    'is_active': is_active,
                },
            )
        self.stdout.write(self.style.SUCCESS(f'{len(freelancer_rows)} freelancers ready'))

        model_rows = [
            ('Kavya Menon', '98765 43210', 24, 'FEMALE', 168, ['MODELLING'], 8000, True),
            ('Rohan Das', '91234 11223', 28, 'MALE', 180, ['MODELLING', 'ACTING'], 6000, True),
            ('Meera Suresh', '90001 22331', 22, 'FEMALE', 162, ['ACTING'], 5500, True),
            ('Arjun Pillai', '99887 66550', 31, 'MALE', 175, ['MODELLING'], 7000, False),
            ('Priya Nair', '91234 56789', 26, 'FEMALE', 165, ['MODELLING'], 6500, True),
        ]
        for name, mobile, age, gender, height_cm, categories, cost, is_active in model_rows:
            ModelProfile.objects.update_or_create(
                name=name,
                defaults={
                    'mobile': mobile, 'age': age, 'gender': gender, 'height_cm': height_cm,
                    'categories': categories, 'cost_per_day': cost, 'is_active': is_active,
                },
            )
        self.stdout.write(self.style.SUCCESS(f'{len(model_rows)} models ready'))
