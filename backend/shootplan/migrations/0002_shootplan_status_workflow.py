import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shootplan', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='shootplan',
            name='status',
            field=models.CharField(
                choices=[
                    ('DRAFT', 'Draft'),
                    ('PRODUCTION_REVIEW', 'Production Review'),
                    ('ON_HOLD', 'On Hold'),
                    ('RETURNED_FOR_CHANGES', 'Returned for Changes'),
                    ('CREATIVE_REVIEW', 'Creative Review'),
                    ('APPROVED', 'Approved'),
                    ('SHOOT_COMPLETED', 'Shoot Completed'),
                    ('ARCHIVED', 'Archived'),
                ],
                default='DRAFT',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='shootplan',
            name='completion_percent',
            field=models.PositiveSmallIntegerField(
                default=0,
                validators=[
                    django.core.validators.MinValueValidator(0),
                    django.core.validators.MaxValueValidator(100),
                ],
            ),
        ),
    ]
