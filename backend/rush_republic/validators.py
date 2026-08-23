from django.core.exceptions import ValidationError

MAX_IMAGE_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


def validate_image_file_size(file):
    """
    Rejects an uploaded image over MAX_IMAGE_UPLOAD_SIZE. Without a cap, any
    authenticated user could exhaust server disk space with oversized
    uploads (moodboards, costume photos, brand logos, etc. all use this).
    """
    if file.size > MAX_IMAGE_UPLOAD_SIZE:
        raise ValidationError(
            f'Image file too large ( {file.size / (1024 * 1024):.1f}MB ). Max size is '
            f'{MAX_IMAGE_UPLOAD_SIZE // (1024 * 1024)}MB.'
        )
