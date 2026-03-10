from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import IngredientUnit


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
    created_at: datetime
