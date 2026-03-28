from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import IngredientUnit
from src.schemas._base import DecimalJSON


class RecipeBase(BaseModel):
    quantity: Decimal = Field(gt=0, decimal_places=3)
    unit: IngredientUnit


class RecipeCreate(RecipeBase):
    product_id: UUID
    ingredient_id: UUID


class RecipeUpdate(BaseModel):
    quantity: Decimal | None = Field(default=None, gt=0, decimal_places=3)
    unit: IngredientUnit | None = None


class RecipeResponse(RecipeBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    ingredient_id: UUID
    quantity: DecimalJSON
    created_at: datetime

# respuesta para el costo de producción de un producto
class ProductionCostResponse(BaseModel):
    product_id: UUID
    cost_per_unit: DecimalJSON
    recipe_count: int
