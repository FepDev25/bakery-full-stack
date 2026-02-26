from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from src.models.sale import Sale
    from src.models.product import Product

import uuid
from decimal import Decimal
from datetime import datetime

from sqlalchemy import String, Numeric, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from src.core.database import Base

class SaleItem(Base):
    __tablename__ = "sale_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    sale_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sales.id"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False) 
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # relationships
    sale: Mapped["Sale"] = relationship("Sale", back_populates="items")
    product: Mapped["Product"] = relationship("Product", back_populates="sale_items")