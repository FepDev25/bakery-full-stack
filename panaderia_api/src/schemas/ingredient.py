from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import IngredientUnit

class IngredientBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    unit: IngredientUnit = IngredientUnit.KG
    min_stock_alert: Decimal = Field(default=Decimal("0.000"), ge=0, decimal_places=3)

class IngredientCreate(IngredientBase):
    pass

class IngredientUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    unit: IngredientUnit | None = None
    min_stock_alert: Decimal | None = Field(default=None, ge=0, decimal_places=3)
    is_active: bool | None = None

class IngredientResponse(IngredientBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    stock_quantity: Decimal
    unit_cost: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
