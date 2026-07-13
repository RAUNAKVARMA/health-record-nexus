import random
from datetime import datetime

from sqlalchemy.orm import Session

from app.db.models import User


def generate_health_id(name: str, phone_number: str, gender: str) -> str:
    name_hash = sum(ord(c) for c in name.lower())
    phone_hash = sum(ord(c) for c in phone_number)
    gender_code = "1" if gender == "male" else "2" if gender == "female" else "3"
    unique_id = str(name_hash + phone_hash).zfill(5)[:5]
    rand = str(random.randint(0, 99)).zfill(2)
    today = datetime.now()
    return f"{today.year}{today.month:02d}{unique_id}{gender_code}{rand}"


def ensure_unique_health_id(
    db: Session, name: str, phone_number: str, gender: str
) -> str:
    existing = (
        db.query(User)
        .filter(
            User.type == "patient",
            User.name == name,
            User.phone_number == phone_number,
        )
        .first()
    )
    if existing and existing.health_id:
        return existing.health_id

    health_id = generate_health_id(name, phone_number, gender)
    for _ in range(20):
        if not db.query(User).filter(User.health_id == health_id).first():
            return health_id
        health_id = generate_health_id(name, phone_number, gender)
    raise RuntimeError("Could not generate a unique Health ID")
