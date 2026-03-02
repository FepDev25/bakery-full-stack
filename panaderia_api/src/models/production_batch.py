from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from src.models.product import Product
    from src.models.user import User

import uuid
from decimal import Decimal
from datetime import date

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey, Numeric, String, Date, func, Text
from sqlalchemy import Enum as SAEnum

from src.models.mixins import TimestampMixin
from src.core.database import Base
from src.models.enums import ProductionBatchStatus

class ProductionBatch(Base, TimestampMixin):
    __tablename__ = "production_batches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    quantity_produced: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    production_date: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=func.current_date()
    )
    ingredient_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=Decimal("0.00"))
    status: Mapped[ProductionBatchStatus] = mapped_column(
        SAEnum(ProductionBatchStatus, name="production_batch_status"),
        nullable=False,
        default=ProductionBatchStatus.EN_PROCESO
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # relationships
    product: Mapped["Product"] = relationship("Product", back_populates="production_batches")
    user: Mapped["User"] = relationship("User", back_populates="production_batches")
