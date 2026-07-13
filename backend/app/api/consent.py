from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db.models import ConsentRequest, MedicalRecord, User
from app.db.session import get_db
from app.deps import require_hospital, require_patient
from app.schemas import AccessRequest, ConsentOut, ConsentRecordBrief, ConsentUpdate

router = APIRouter(prefix="/consent", tags=["consent"])


def _serialize(req: ConsentRequest) -> ConsentOut:
    record = None
    if req.record:
        record = ConsentRecordBrief(
            id=req.record.id,
            record_type=req.record.record_type,
            notes=req.record.notes,
            file_name=req.record.file_name,
        )
    return ConsentOut(
        id=req.id,
        type=req.type,  # type: ignore[arg-type]
        status=req.status,
        created_at=req.created_at,
        hospital=req.hospital,
        record=record,
    )


@router.get("", response_model=list[ConsentOut])
def list_pending(
    db: Session = Depends(get_db),
    patient: User = Depends(require_patient),
):
    requests = (
        db.query(ConsentRequest)
        .options(
            joinedload(ConsentRequest.hospital),
            joinedload(ConsentRequest.record),
        )
        .filter(
            ConsentRequest.patient_id == patient.id,
            ConsentRequest.status == "pending",
        )
        .order_by(ConsentRequest.created_at.desc())
        .all()
    )
    return [_serialize(r) for r in requests]


@router.post("")
def request_access(
    body: AccessRequest,
    db: Session = Depends(get_db),
    hospital: User = Depends(require_hospital),
):
    patient = (
        db.query(User)
        .filter(User.type == "patient", User.health_id == body.health_id)
        .first()
    )
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    existing = (
        db.query(ConsentRequest)
        .filter(
            ConsentRequest.hospital_id == hospital.id,
            ConsentRequest.patient_id == patient.id,
            ConsentRequest.type == "access",
            ConsentRequest.status.in_(["pending", "approved"]),
        )
        .first()
    )
    if existing:
        return {
            "id": existing.id,
            "status": existing.status,
            "alreadyExists": True,
            "patientName": patient.name,
        }

    consent = ConsentRequest(
        type="access",
        patient_id=patient.id,
        hospital_id=hospital.id,
        status="pending",
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)
    return {
        "id": consent.id,
        "status": consent.status,
        "patientName": patient.name,
        "alreadyExists": False,
    }


@router.patch("")
def update_consent(
    body: ConsentUpdate,
    db: Session = Depends(get_db),
    patient: User = Depends(require_patient),
):
    consent = db.get(ConsentRequest, body.request_id)
    if not consent or consent.patient_id != patient.id:
        raise HTTPException(status_code=404, detail="Request not found")
    if consent.status != "pending":
        raise HTTPException(status_code=400, detail="Request already resolved")

    consent.status = body.status
    if body.status == "approved" and consent.type == "upload" and consent.record_id:
        record = db.get(MedicalRecord, consent.record_id)
        if record:
            record.is_approved = True
    db.commit()
    db.refresh(consent)
    return {"id": consent.id, "status": consent.status}
