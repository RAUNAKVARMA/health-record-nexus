from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import User
from app.db.session import get_db
from app.deps import get_current_user
from app.schemas import (
    HospitalRegister,
    LoginRequest,
    PatientRegister,
    TokenResponse,
)
from app.services.health_id import ensure_unique_health_id

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_for(user: User) -> TokenResponse:
    token = create_access_token(
        {
            "sub": user.id,
            "role": user.type,
            "healthId": user.health_id,
            "name": user.name,
        }
    )
    return TokenResponse(
        access_token=token,
        role=user.type,  # type: ignore[arg-type]
        user_id=user.id,
        name=user.name,
        email=user.email,
        health_id=user.health_id,
    )


@router.post("/register/hospital", response_model=TokenResponse)
def register_hospital(body: HospitalRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=409, detail="A hospital with this email already exists")
    user = User(
        type="hospital",
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_for(user)


@router.post("/register/patient", response_model=TokenResponse)
def register_patient(body: PatientRegister, db: Session = Depends(get_db)):
    health_id = body.health_id or ensure_unique_health_id(
        db, body.name, body.phone_number, body.gender
    )
    if db.query(User).filter(User.health_id == health_id).first():
        raise HTTPException(status_code=409, detail="A patient with this Health ID already exists")
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
    return _token_for(user)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    if body.login_type == "hospital":
        user = db.query(User).filter(User.type == "hospital", User.email == body.identifier).first()
    else:
        user = (
            db.query(User)
            .filter(User.type == "patient", User.health_id == body.identifier)
            .first()
        )
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return _token_for(user)


@router.get("/me", response_model=TokenResponse)
def me(user: User = Depends(get_current_user)):
    return _token_for(user)
