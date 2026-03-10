from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

class CustomerBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    address: str | None = None

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str | None) -> str | None:
        if v is not None:
            return v.strip()
        return v

    @model_validator(mode="after")
    def check_contact_required(self) -> "CustomerBase":
        if self.phone is None and self.email is None:
            raise ValueError("El cliente debe tener al menos teléfono o email")
        return self


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = None
    address: str | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def check_contact_if_both_provided(self) -> "CustomerUpdate":
        # Solo validamos si ambos se están seteando explícitamente a None
        # No podemos saber si el cliente ya tiene uno de los dos en la BD
        if self.phone is not None or self.email is not None:
            return self
        if self.phone == "" or self.email == "":
            raise ValueError("El teléfono o email no pueden ser strings vacíos")
        return self


class CustomerResponse(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    loyalty_points: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
