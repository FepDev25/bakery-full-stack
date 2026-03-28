from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import IngredientUnit
from src.schemas._base import DecimalJSON


class IngredientPurchaseBase(BaseModel):
    supplier_id: UUID
    ingredient_id: UUID
    quantity: Decimal = Field(gt=0, decimal_places=3)
    unit: IngredientUnit
    unit_price: Decimal = Field(ge=0, decimal_places=2)
    purchase_date: date
    invoice_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class IngredientPurchaseCreate(IngredientPurchaseBase):
    # total_amount lo calcula el servicio: quantity * unit_price
    pass


class IngredientPurchaseResponse(IngredientPurchaseBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    quantity: DecimalJSON
    unit_price: DecimalJSON
    total_amount: DecimalJSON
    created_at: datetime
