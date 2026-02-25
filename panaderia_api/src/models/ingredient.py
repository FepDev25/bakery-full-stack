from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from src.models.recipe import Recipe
    
from src.models.mixins import TimestampMixin
from src.core.database import Base
from src.models.enums import IngredientUnit

import uuid
from decimal import Decimal

from sqlalchemy import String, Numeric, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Enum as SAEnum
class Ingredient(Base, TimestampMixin):
    __tablename__ = "ingredients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    unit: Mapped[IngredientUnit] = mapped_column(
        SAEnum(IngredientUnit, name="ingredient_unit"),
        nullable=False,
        default=IngredientUnit.KG
    )
    stock_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False, default=Decimal("0.000"))
    min_stock_alert: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False, default=Decimal("0.000"))
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    recipes: Mapped[list["Recipe"]] = relationship("Recipe", back_populates="ingredient")