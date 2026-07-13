import re
from pathlib import Path

from app.core.config import get_settings

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "text/plain",
}


def store_file(file_name: str, content: bytes) -> str:
    settings = get_settings()
    uploads = Path(settings.uploads_dir)
    uploads.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^a-zA-Z0-9._-]", "_", file_name)
    stored = f"{int(__import__('time').time() * 1000)}_{safe}"
    path = uploads / stored
    path.write_bytes(content)
    return stored


def resolve_file_path(stored_name: str) -> Path:
    settings = get_settings()
    return Path(settings.uploads_dir) / stored_name
