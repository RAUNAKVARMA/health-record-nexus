import re
import time
from pathlib import Path

import httpx

from app.core.config import get_settings

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "text/plain",
}


def supabase_enabled() -> bool:
    settings = get_settings()
    return bool(settings.supabase_url and settings.supabase_service_role_key)


def _supabase_headers() -> dict[str, str]:
    settings = get_settings()
    return {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "apikey": settings.supabase_service_role_key,
    }


def store_file(file_name: str, content: bytes, content_type: str = "application/octet-stream") -> str:
    settings = get_settings()
    safe = re.sub(r"[^a-zA-Z0-9._-]", "_", file_name)
    object_key = f"records/{int(time.time() * 1000)}_{safe}"

    if supabase_enabled():
        url = (
            f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
            f"{settings.supabase_bucket}/{object_key}"
        )
        with httpx.Client(timeout=60.0) as client:
            res = client.post(
                url,
                content=content,
                headers={
                    **_supabase_headers(),
                    "Content-Type": content_type,
                    "x-upsert": "true",
                },
            )
            if res.status_code >= 400:
                raise RuntimeError(f"Supabase upload failed: {res.status_code} {res.text}")
        return f"supabase:{object_key}"

    uploads = Path(settings.uploads_dir)
    uploads.mkdir(parents=True, exist_ok=True)
    stored = object_key.split("/", 1)[-1]
    (uploads / stored).write_bytes(content)
    return stored


def read_file_bytes(stored_path: str) -> bytes | None:
    settings = get_settings()

    if stored_path.startswith("supabase:"):
        object_key = stored_path.removeprefix("supabase:")
        if not supabase_enabled():
            return None
        url = (
            f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
            f"{settings.supabase_bucket}/{object_key}"
        )
        with httpx.Client(timeout=60.0) as client:
            res = client.get(url, headers=_supabase_headers())
            if res.status_code >= 400:
                return None
            return res.content

    # Local disk fallback (older uploads)
    path = Path(settings.uploads_dir) / stored_path
    if path.exists():
        return path.read_bytes()

    # If Supabase is enabled, also try treating bare keys as Supabase objects
    if supabase_enabled() and "/" in stored_path:
        url = (
            f"{settings.supabase_url.rstrip('/')}/storage/v1/object/"
            f"{settings.supabase_bucket}/{stored_path}"
        )
        with httpx.Client(timeout=60.0) as client:
            res = client.get(url, headers=_supabase_headers())
            if res.status_code < 400:
                return res.content

    return None
