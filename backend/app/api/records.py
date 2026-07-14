from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.db.models import ConsentRequest, MedicalRecord, User
from app.db.session import get_db
from app.deps import get_current_user, require_hospital
from app.schemas import RecordOut
from app.services.storage import ALLOWED_TYPES, store_file

router = APIRouter(prefix="/records", tags=["records"])


def _serialize(record: MedicalRecord) -> RecordOut:
    return RecordOut(
        id=record.id,
        record_type=record.record_type,
        file_name=record.file_name,
        notes=record.notes,
        created_at=record.created_at,
        hospital=record.hospital,
    )


@router.post("")
async def upload_record(
    healthId: str = Form(...),
    recordType: str = Form(...),
    notes: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    hospital: User = Depends(require_hospital),
):
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File must be under 10MB")
    mime = file.content_type or "application/octet-stream"
    if mime not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use PDF, JPG, PNG, WEBP, GIF, or TXT.",
        )

    patient = (
        db.query(User).filter(User.type == "patient", User.health_id == healthId).first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    stored = store_file(file.filename or "upload.bin", content, mime)
    record = MedicalRecord(
        patient_id=patient.id,
        hospital_id=hospital.id,
        record_type=recordType,
        file_name=file.filename or "upload.bin",
        file_mime=mime,
        file_path=stored,
        notes=notes or None,
        is_approved=False,
    )
    db.add(record)
    db.flush()
    consent = ConsentRequest(
        type="upload",
        patient_id=patient.id,
        hospital_id=hospital.id,
        status="pending",
        record_id=record.id,
    )
    db.add(consent)
    db.commit()
    return {"recordId": record.id, "consentId": consent.id, "status": "pending"}


@router.get("", response_model=list[RecordOut])
def list_records(
    healthId: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.type == "patient":
        records = (
            db.query(MedicalRecord)
            .options(joinedload(MedicalRecord.hospital))
            .filter(MedicalRecord.patient_id == user.id, MedicalRecord.is_approved.is_(True))
            .order_by(MedicalRecord.created_at.desc())
            .all()
        )
        return [_serialize(r) for r in records]

    if not healthId:
        raise HTTPException(status_code=400, detail="healthId is required")

    patient = (
        db.query(User).filter(User.type == "patient", User.health_id == healthId).first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    has_access = (
        db.query(ConsentRequest)
        .filter(
            ConsentRequest.hospital_id == user.id,
            ConsentRequest.patient_id == patient.id,
            ConsentRequest.type == "access",
            ConsentRequest.status == "approved",
        )
        .first()
    )

    q = (
        db.query(MedicalRecord)
        .options(joinedload(MedicalRecord.hospital))
        .filter(MedicalRecord.patient_id == patient.id, MedicalRecord.is_approved.is_(True))
    )
    if not has_access:
        q = q.filter(MedicalRecord.hospital_id == user.id)
    records = q.order_by(MedicalRecord.created_at.desc()).all()
    return [_serialize(r) for r in records]
