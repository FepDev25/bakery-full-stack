from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SaleItemCreate(BaseModel):
    # No hay Base ni Update: sale_items son inmutables
    # Se crean junto con la venta, nunca se editan
    product_id: UUID
    quantity: Decimal = Field(gt=0, decimal_places=3)
    # unit y unit_price los resuelve el servicio desde el producto al momento de la venta


class SaleItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    sale_id: UUID
    product_id: UUID
    quantity: Decimal
    unit: str
    unit_price: Decimal
    subtotal: Decimal
    created_at: datetime
