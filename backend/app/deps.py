from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.models import User
from app.db.session import get_db

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    payload = decode_access_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.get(User, payload["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_hospital(user: User = Depends(get_current_user)) -> User:
    if user.type != "hospital":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hospital only")
    return user


def require_patient(user: User = Depends(get_current_user)) -> User:
    if user.type != "patient":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient only")
    return user
