from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
UPLOADS_DIR = BACKEND_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def normalize_database_url(url: str) -> str:
    """Render/Heroku give postgres://; SQLAlchemy wants postgresql+psycopg2://."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://") and "+psycopg2" not in url:
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Health Record Nexus API"
    # SQLite for local without Docker; switch to Postgres when available:
    # postgresql+psycopg2://health:health@localhost:5432/health_record
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'health_record.db').as_posix()}"
    jwt_secret: str = "dev-secret-change-me-health-record-nexus-32chars"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "https://health-record-nexus-secure.vercel.app"
    )
    uploads_dir: str = str(UPLOADS_DIR)

    # Supabase Storage (optional — used when both URL + service role key are set)
    supabase_url: str = "https://dwqnpfjaxnkbvjrypdgv.supabase.co"
    supabase_service_role_key: str = ""
    supabase_bucket: str = "health-record-files"

    @property
    def sqlalchemy_database_url(self) -> str:
        return normalize_database_url(self.database_url)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
