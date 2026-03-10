from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class SupplierBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    contact_person: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    address: str | None = None
    tax_id: str | None = Field(default=None, max_length=50)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, v: str) -> str:
        return v.strip()

    @field_validator("tax_id")
    @classmethod
    def normalize_tax_id(cls, v: str | None) -> str | None:
        if v is not None:
            return v.strip().upper()
        return v

    @model_validator(mode="after")
    def check_contact_required(self) -> "SupplierBase":
        if self.phone is None and self.email is None:
            raise ValueError("El proveedor debe tener al menos teléfono o email")
        return self


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    contact_person: str | None = None
    phone: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    address: str | None = None
    tax_id: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None


class SupplierResponse(SupplierBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
