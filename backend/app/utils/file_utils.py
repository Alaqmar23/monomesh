import re
import uuid
from pathlib import Path
from typing import Tuple
from app.core.config import settings

def sanitize_filename(filename: str) -> str:
    # Remove path traversal and unsafe characters
    base = Path(filename).name
    clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', base)
    return clean

def generate_unique_filename(original_name: str) -> Tuple[str, str]:
    clean = sanitize_filename(original_name)
    ext = Path(clean).suffix.lower()
    unique_id = uuid.uuid4().hex[:12]
    unique_name = f"{Path(clean).stem}_{unique_id}{ext}"
    return unique_id, unique_name

def validate_image_extension(filename: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in settings.ALLOWED_IMAGE_EXTENSIONS

def validate_model_extension(filename: str) -> bool:
    ext = Path(filename).suffix.lower()
    return ext in settings.ALLOWED_MODEL_EXTENSIONS
