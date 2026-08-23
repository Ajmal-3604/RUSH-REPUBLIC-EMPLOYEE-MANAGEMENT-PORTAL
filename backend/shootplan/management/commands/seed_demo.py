"""
Seeds one demo account per department plus a sample shoot plan and feedback,
so the portal is walkable end-to-end straight after `migrate`.

    python manage.py seed_demo

Idempotent: re-running updates the demo users instead of duplicating them.
Every demo account uses the password `Rush@2026Demo`.
"""

from datetime import date, time, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction

from users.models import CustomUser, Department

from shootplan.models import (
    ShootPlan,
    Reel,
    Photo,
    CrewMember,
    BudgetItem,
    ReviewApproval,
    Feedback,
)

DEMO_PASSWORD = 'Rush@2026Demo'

DEMO_USERS = [
    ('admin.demo', 'admin.demo@therushrepublic.com', '9000000001', Department.ADMIN),
    ('prodhead.demo', 'prodhead.demo@therushrepublic.com', '9000000006', Department.PRODUCTION_HEAD),
    ('social.demo', 'social.demo@therushrepublic.com', '9000000002', Department.SOCIAL_MEDIA),
    ('prod.demo', 'prod.demo@therushrepublic.com', '9000000003', Department.PRODUCTION_COORDINATOR),
    ('client.demo', 'client.demo@therushrepublic.com', '9000000004', Department.CLIENT_SERVICING),
    ('writer.demo', 'writer.demo@therushrepublic.com', '9000000005', Department.SCRIPT_WRITER),
]


class Command(BaseCommand):
    help = 'Creates demo users, a sample shoot plan per department, and feedback.'

    @transaction.atomic
    def handle(self, *args, **options):
        users = {}

        for username, email, contact, department in DEMO_USERS:
            user, created = CustomUser.objects.get_or_create(
                email=email,
                defaults={'username': username, 'contact': contact, 'department': department},
            )
            user.username = username
            user.contact = contact
            user.department = department
            user.is_staff = department == Department.ADMIN
            user.set_password(DEMO_PASSWORD)
            user.save()
            users[department] = user
            self.stdout.write(
                self.style.SUCCESS(f'{"created" if created else "updated"} {email} [{department}]')
            )

        plans = [
            (Department.SOCIAL_MEDIA, 'Summer Drop Campaign', 'Acme Apparel', 'Rooftop Studio, Kochi', ShootPlan.Status.PRODUCTION_REVIEW, 71),
            (Department.PRODUCTION_COORDINATOR, 'Q3 Brand Film', 'Globex Corp', 'Warehouse 4, Bengaluru', ShootPlan.Status.CREATIVE_REVIEW, 45),
            (Department.CLIENT_SERVICING, 'Client Onboarding Shoot', 'Initech', 'Client HQ, Chennai', ShootPlan.Status.DRAFT, 14),
            (Department.SCRIPT_WRITER, 'Docu-Series Episode 01', 'Umbrella Media', 'Location scout, Munnar', ShootPlan.Status.APPROVED, 100),
        ]

        for offset, (department, title, client, location, plan_status, completion) in enumerate(plans):
            plan, created = ShootPlan.objects.get_or_create(
                title=title,
                department=department,
                defaults={
                    'client_name': client,
                    'location': location,
                    'brief': f'Demo shoot plan seeded for the {dict(Department.choices)[department]} team.',
                    'shoot_date': date.today() + timedelta(days=7 + offset * 3),
                    'call_time': time(7, 30),
                    'wrap_time': time(18, 0),
                    'status': plan_status,
                    'completion_percent': completion,
                    'created_by': users[department],
                },
            )
            if not created:
                self.stdout.write(f'shoot plan already present: {title}')
                continue

            Reel.objects.create(
                shoot_plan=plan, title=f'{title} - Teaser',
                concept='15s hook cut for the feed, vertical.',
                platform=Reel.Platform.INSTAGRAM, duration_seconds=15,
                status=Reel.Status.SCRIPTED, assigned_to=users[department].username,
            )
            Reel.objects.create(
                shoot_plan=plan, title=f'{title} - Long Form',
                concept='60s narrative cut for YouTube Shorts.',
                platform=Reel.Platform.YOUTUBE, duration_seconds=60,
                status=Reel.Status.IDEA,
            )
            Photo.objects.create(
                shoot_plan=plan, title='Hero product stills',
                shot_type=Photo.ShotType.PRODUCT, quantity=12,
                description='Clean white-sweep product frames.',
            )
            Photo.objects.create(
                shoot_plan=plan, title='Behind the scenes',
                shot_type=Photo.ShotType.BTS, quantity=25,
                description='Candid set coverage for the socials.',
            )
            CrewMember.objects.create(
                shoot_plan=plan, name='R. Menon', role=CrewMember.Role.DIRECTOR,
                contact='9111100001', call_time=time(7, 0), day_rate=18000,
            )
            CrewMember.objects.create(
                shoot_plan=plan, name='A. Iyer', role=CrewMember.Role.DOP,
                contact='9111100002', call_time=time(7, 30), day_rate=15000,
            )
            CrewMember.objects.create(
                shoot_plan=plan, name='S. Kurian', role=CrewMember.Role.PHOTOGRAPHER,
                contact='9111100003', call_time=time(8, 0), day_rate=9000,
            )
            for category, description, allocated, spent in [
                (BudgetItem.Category.CREW, 'Director, DOP, photographer day rates', 42000, 42000),
                (BudgetItem.Category.EQUIPMENT, 'Camera body, primes, lighting kit', 26000, 21500),
                (BudgetItem.Category.LOCATION, 'Studio and permits', 18000, 18000),
                (BudgetItem.Category.CATERING, 'Crew meals, 12 head count', 7500, 6200),
                (BudgetItem.Category.CONTINGENCY, 'Buffer at 10%', 9500, 0),
            ]:
                BudgetItem.objects.create(
                    shoot_plan=plan, category=category, description=description,
                    allocated_amount=allocated, spent_amount=spent,
                )
            ReviewApproval.objects.create(
                shoot_plan=plan, status=ReviewApproval.Status.PENDING,
                remarks='Awaiting sign-off on the budget allowance.',
                reviewer=users[Department.ADMIN],
            )
            Feedback.objects.create(
                shoot_plan=plan, department=department, author=users[department],
                subject=f'{title} - prep notes',
                message='Gear list is locked. Flagging that the contingency line has no spend yet.',
                category=Feedback.Category.SHOOT, rating=4,
                status=Feedback.Status.OPEN,
            )
            self.stdout.write(self.style.SUCCESS(f'seeded shoot plan: {title} [{department}]'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Demo data ready.'))
        self.stdout.write(f'  password for every demo account: {DEMO_PASSWORD}')
        for _, email, _, department in DEMO_USERS:
            self.stdout.write(f'  {department:<24} {email}')
