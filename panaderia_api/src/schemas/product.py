from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import ProductUnit

class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    price: Decimal = Field(ge=0, decimal_places=2)
    unit: ProductUnit = ProductUnit.UNIDAD
    min_stock_alert: Decimal = Field(default=Decimal("0.000"), ge=0, decimal_places=3)

class ProductCreate(ProductBase):
    category_id: UUID

class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    unit: ProductUnit | None = None
    category_id: UUID | None = None
    min_stock_alert: Decimal | None = Field(default=None, ge=0, decimal_places=3)
    is_active: bool | None = None

class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    category_id: UUID
    stock_quantity: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime
