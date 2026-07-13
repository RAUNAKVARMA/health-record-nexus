import secrets
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _cuid() -> str:
    return secrets.token_urlsafe(16)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_cuid)
    type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    health_id: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(16), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    hospital_records: Mapped[list["MedicalRecord"]] = relationship(
        back_populates="hospital",
        foreign_keys="MedicalRecord.hospital_id",
    )
    patient_records: Mapped[list["MedicalRecord"]] = relationship(
        back_populates="patient",
        foreign_keys="MedicalRecord.patient_id",
    )
    hospital_consents: Mapped[list["ConsentRequest"]] = relationship(
        back_populates="hospital",
        foreign_keys="ConsentRequest.hospital_id",
    )
    patient_consents: Mapped[list["ConsentRequest"]] = relationship(
        back_populates="patient",
        foreign_keys="ConsentRequest.patient_id",
    )


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_cuid)
    patient_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    record_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_mime: Mapped[str] = mapped_column(String(100), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient: Mapped[User] = relationship(back_populates="patient_records", foreign_keys=[patient_id])
    hospital: Mapped[User] = relationship(back_populates="hospital_records", foreign_keys=[hospital_id])
    consent_request: Mapped["ConsentRequest | None"] = relationship(
        back_populates="record",
        uselist=False,
    )


class ConsentRequest(Base):
    __tablename__ = "consent_requests"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_cuid)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    patient_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    record_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("medical_records.id"), unique=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient: Mapped[User] = relationship(back_populates="patient_consents", foreign_keys=[patient_id])
    hospital: Mapped[User] = relationship(back_populates="hospital_consents", foreign_keys=[hospital_id])
    record: Mapped[MedicalRecord | None] = relationship(back_populates="consent_request")
