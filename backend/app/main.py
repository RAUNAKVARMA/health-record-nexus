from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, consent, files, patients, records
from app.core.config import get_settings
from app.db.session import Base, engine

settings = get_settings()

app = FastAPI(title=settings.app_name, version="1.0.0")

# Allow CORS from any origin when CORS_ORIGINS=* (useful on Render demos)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.cors_origins.strip() == "*" else settings.cors_origin_list,
    allow_credentials=False if settings.cors_origins.strip() == "*" else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(records.router, prefix="/api")
app.include_router(consent.router, prefix="/api")
app.include_router(files.router, prefix="/api")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": settings.app_name}
