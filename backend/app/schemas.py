from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Literal["hospital", "patient"]
    user_id: str
    name: str
    email: str | None = None
    health_id: str | None = None


class HospitalRegister(BaseModel):
    type: Literal["hospital"] = "hospital"
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=6)


class PatientRegister(BaseModel):
    type: Literal["patient"] = "patient"
    name: str = Field(min_length=2)
    phone_number: str = Field(min_length=6, alias="phoneNumber")
    gender: Literal["male", "female", "other"]
    password: str = Field(min_length=6)
    health_id: str | None = Field(default=None, alias="healthId")

    model_config = {"populate_by_name": True}


class LoginRequest(BaseModel):
    identifier: str
    password: str
    login_type: Literal["hospital", "patient"] = Field(alias="loginType")

    model_config = {"populate_by_name": True}


class PatientCreate(BaseModel):
    name: str = Field(min_length=2)
    phone_number: str = Field(min_length=6, alias="phoneNumber")
    gender: Literal["male", "female", "other"]
    password: str = Field(min_length=6)

    model_config = {"populate_by_name": True}


class PatientOut(BaseModel):
    id: str
    name: str
    health_id: str | None = Field(serialization_alias="healthId")
    gender: str | None = None
    phone_number: str | None = Field(default=None, serialization_alias="phoneNumber")
    already_exists: bool | None = Field(default=None, serialization_alias="alreadyExists")

    model_config = {"from_attributes": True, "populate_by_name": True}


class HospitalBrief(BaseModel):
    id: str
    name: str

    model_config = {"from_attributes": True}


class RecordOut(BaseModel):
    id: str
    record_type: str = Field(serialization_alias="recordType")
    file_name: str = Field(serialization_alias="fileName")
    notes: str | None = None
    created_at: datetime = Field(serialization_alias="createdAt")
    hospital: HospitalBrief

    model_config = {"from_attributes": True, "populate_by_name": True}


class ConsentRecordBrief(BaseModel):
    id: str
    record_type: str = Field(serialization_alias="recordType")
    notes: str | None = None
    file_name: str = Field(serialization_alias="fileName")

    model_config = {"from_attributes": True, "populate_by_name": True}


class ConsentOut(BaseModel):
    id: str
    type: Literal["upload", "access"]
    status: str
    created_at: datetime = Field(serialization_alias="createdAt")
    hospital: HospitalBrief
    record: ConsentRecordBrief | None = None

    model_config = {"from_attributes": True, "populate_by_name": True}


class AccessRequest(BaseModel):
    health_id: str = Field(alias="healthId")

    model_config = {"populate_by_name": True}


class ConsentUpdate(BaseModel):
    request_id: str = Field(alias="requestId")
    status: Literal["approved", "rejected"]

    model_config = {"populate_by_name": True}


class MessageOut(BaseModel):
    detail: str
