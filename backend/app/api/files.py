from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.models import ConsentRequest, MedicalRecord, User
from app.db.session import get_db
from app.deps import get_current_user
from app.services.storage import read_file_bytes

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/{record_id}")
def download_file(
    record_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    record = db.get(MedicalRecord, record_id)
    if not record or not record.is_approved:
        raise HTTPException(status_code=404, detail="Record not found")

    is_patient_owner = user.type == "patient" and record.patient_id == user.id
    is_hospital_owner = user.type == "hospital" and record.hospital_id == user.id
    hospital_has_access = is_hospital_owner

    if user.type == "hospital" and not is_hospital_owner:
        access = (
            db.query(ConsentRequest)
            .filter(
                ConsentRequest.hospital_id == user.id,
                ConsentRequest.patient_id == record.patient_id,
                ConsentRequest.type == "access",
                ConsentRequest.status == "approved",
            )
            .first()
        )
        hospital_has_access = bool(access)

    if not is_patient_owner and not hospital_has_access:
        raise HTTPException(status_code=403, detail="Forbidden")

    data = read_file_bytes(record.file_path)
    if data is None:
        raise HTTPException(status_code=404, detail="File missing on server")

    return Response(
        content=data,
        media_type=record.file_mime,
        headers={
            "Content-Disposition": f'attachment; filename="{record.file_name.replace(chr(34), "")}"'
        },
    )
