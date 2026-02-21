import uuid
from sqlalchemy import String, Boolean, ForeignKey, Numeric, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.database import Base
from src.models.mixins import TimestampMixin
from src.models.enums import ProductUnit
from decimal import Decimal
from sqlalchemy import UniqueConstraint

from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from src.models.category import Category

class Product(Base, TimestampMixin):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("name", "category_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unit: Mapped[ProductUnit] = mapped_column(
        SAEnum(ProductUnit, name="product_unit"),
        nullable=False,
        default=ProductUnit.UNIDAD
    )
    stock_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False, default=Decimal("0.000"))
    min_stock_alert: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False, default=Decimal("0.000"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    category: Mapped["Category"] = relationship("Category", back_populates="products")
