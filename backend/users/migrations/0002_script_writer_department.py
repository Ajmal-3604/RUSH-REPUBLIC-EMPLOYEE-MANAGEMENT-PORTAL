from django.db import migrations, models


class Migration(migrations.Migration):
    """Adds the Script Writer department and a default ordering on CustomUser."""

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='customuser',
            options={'ordering': ['-created_at']},
        ),
        migrations.AlterField(
            model_name='customuser',
            name='department',
            field=models.CharField(
                choices=[
                    ('ADMIN', 'Admin'),
                    ('SOCIAL_MEDIA', 'Social Media'),
                    ('PRODUCTION_COORDINATOR', 'Production Co-Ordinator'),
                    ('CLIENT_SERVICING', 'Client-Servicing'),
                    ('SCRIPT_WRITER', 'Script Writer'),
                ],
                max_length=30,
            ),
        ),
    ]
