import imghdr
import os
from typing import Optional, Tuple

from werkzeug.datastructures import FileStorage

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
ALLOWED_IMAGE_MIME_TYPES = {'image/jpeg', 'image/jpg', 'image/png'}
ALLOWED_IMAGE_SIGNATURES = {'jpeg', 'png'}


def validate_uploaded_image(image_file: Optional[FileStorage]) -> Tuple[bool, Optional[str]]:
    """Validate uploaded image using extension, MIME type, and file signature."""
    if image_file is None or not image_file.filename:
        return True, None

    filename = image_file.filename.strip()
    _, ext = os.path.splitext(filename)
    ext = ext.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return False, 'Only JPG and PNG image files are allowed.'

    mime_type = (image_file.mimetype or '').strip().lower()
    if mime_type not in ALLOWED_IMAGE_MIME_TYPES:
        return False, 'Invalid file type. Please upload a valid JPG or PNG image.'

    stream = image_file.stream
    current_pos = stream.tell()
    try:
        header = stream.read(512)
    finally:
        stream.seek(current_pos)

    detected_type = imghdr.what(None, h=header)
    if detected_type not in ALLOWED_IMAGE_SIGNATURES:
        return False, 'File content is not a valid JPG or PNG image.'

    return True, None
