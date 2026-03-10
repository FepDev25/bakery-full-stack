from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import PaymentMethod, SaleStatus


class SaleBase(BaseModel):
    customer_id: UUID | None = None
    payment_method: PaymentMethod
    notes: str | None = None


class SaleCreate(SaleBase):
    # subtotal, tax_amount, total_amount los calcula el servicio a partir de los items
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0, decimal_places=2)


class SaleCancel(BaseModel):
    # Cambiar status es una operación de negocio dedicada, no un PATCH genérico
    notes: str | None = None


class SaleResponse(SaleBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    sale_number: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    status: SaleStatus
    sale_date: datetime
    created_at: datetime
