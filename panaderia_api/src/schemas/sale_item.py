from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.schemas._base import DecimalJSON


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
    quantity: DecimalJSON
    unit: str
    unit_price: DecimalJSON
    subtotal: DecimalJSON
    created_at: datetime
