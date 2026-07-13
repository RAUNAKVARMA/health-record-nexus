from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models import User
from app.db.session import get_db
from app.deps import require_hospital
from app.schemas import PatientCreate, PatientOut
from app.services.health_id import ensure_unique_health_id

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", response_model=PatientOut)
def create_patient(
    body: PatientCreate,
    db: Session = Depends(get_db),
    _hospital: User = Depends(require_hospital),
):
    existing = (
        db.query(User)
        .filter(
            User.type == "patient",
            User.name == body.name,
            User.phone_number == body.phone_number,
        )
        .first()
    )
    if existing and existing.health_id:
        return PatientOut(
            id=existing.id,
            name=existing.name,
            health_id=existing.health_id,
            gender=existing.gender,
            phone_number=existing.phone_number,
            already_exists=True,
        )

    health_id = ensure_unique_health_id(db, body.name, body.phone_number, body.gender)
    user = User(
        type="patient",
        name=body.name,
        phone_number=body.phone_number,
        gender=body.gender,
        health_id=health_id,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return PatientOut(
        id=user.id,
        name=user.name,
        health_id=user.health_id,
        gender=user.gender,
        phone_number=user.phone_number,
    )


@router.get("", response_model=PatientOut)
def get_patient(
    healthId: str,
    db: Session = Depends(get_db),
    _hospital: User = Depends(require_hospital),
):
    patient = (
        db.query(User).filter(User.type == "patient", User.health_id == healthId).first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return PatientOut(
        id=patient.id,
        name=patient.name,
        health_id=patient.health_id,
        gender=patient.gender,
        phone_number=patient.phone_number,
    )
