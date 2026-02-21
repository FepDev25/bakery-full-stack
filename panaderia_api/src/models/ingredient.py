from sqlalchemy import String, Numeric, Boolean
from src.models.mixins import TimestampMixin
from sqlalchemy.orm import Mapped, mapped_column
from src.core.database import Base
import uuid
from sqlalchemy.dialects.postgresql import UUID
from decimal import Decimal
from src.models.enums import IngredientUnit
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
