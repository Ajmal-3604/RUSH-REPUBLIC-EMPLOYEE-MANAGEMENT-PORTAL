import io

from django.core.files.base import ContentFile
from django.core.files.uploadedfile import UploadedFile
from PIL import Image, ImageOps

# Long-edge cap for stored images. Uploads (especially straight-off-a-phone
# photos) can be 4000px+ / several MB; nothing in this app ever displays an
# image anywhere near that size, so downscaling here is pure disk savings
# with no visible loss.
MAX_DIMENSION = 2000
JPEG_QUALITY = 88


def _compress(uploaded_file, max_dimension, quality):
    """
    Downscale (if oversized) and re-encode an image at a high, visually
    lossless quality setting. Transparent PNGs (logos) stay PNG so they don't
    grow a solid background; everything else (real photographs) becomes an
    optimized JPEG, which is dramatically smaller than an unprocessed upload.

    Returns (ContentFile, extension), or None if the file isn't a readable
    image -- callers should leave the original upload untouched in that case.
    """
    try:
        image = Image.open(uploaded_file)
        image = ImageOps.exif_transpose(image)
    except Exception:
        return None

    has_alpha = image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info)

    if max(image.size) > max_dimension:
        image.thumbnail((max_dimension, max_dimension), Image.LANCZOS)

    buffer = io.BytesIO()
    if has_alpha:
        image.convert('RGBA').save(buffer, format='PNG', optimize=True)
        extension = 'png'
    else:
        image.convert('RGB').save(buffer, format='JPEG', quality=quality, optimize=True)
        extension = 'jpg'

    buffer.seek(0)
    return ContentFile(buffer.read()), extension


def compress_image_field(field_file, max_dimension=MAX_DIMENSION, quality=JPEG_QUALITY):
    """
    Replace a model's pending ImageField upload with a compressed version, in
    place, before the model is saved. No-op for anything that isn't a fresh
    upload (already-stored files aren't re-compressed on every save, which
    would lose quality generation after generation) or isn't a readable image.
    """
    if not field_file or not isinstance(field_file.file, UploadedFile):
        return

    result = _compress(field_file, max_dimension, quality)
    if result is None:
        return

    content, extension = result
    base_name = field_file.name.rsplit('.', 1)[0]
    field_file.save(f'{base_name}.{extension}', content, save=False)
