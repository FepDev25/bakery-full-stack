from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import ProductionBatchStatus
from src.schemas._base import DecimalJSON


class ProductionBatchBase(BaseModel):
    product_id: UUID
    quantity_produced: Decimal = Field(gt=0, decimal_places=3)
    unit: str = Field(max_length=50)
    production_date: date
    notes: str | None = None


class ProductionBatchCreate(ProductionBatchBase):
    # ingredient_cost lo calcula el servicio según la receta del producto
    pass


class ProductionBatchUpdate(BaseModel):
    # Solo se puede actualizar el status y las notas
    # quantity_produced y production_date son inmutables una vez creados
    status: ProductionBatchStatus | None = None
    notes: str | None = None


class ProductionBatchResponse(ProductionBatchBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    quantity_produced: DecimalJSON
    ingredient_cost: DecimalJSON
    status: ProductionBatchStatus
    created_at: datetime
    updated_at: datetime
