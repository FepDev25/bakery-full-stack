from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from src.models.user import User
    from src.models.supplier import Supplier
    from src.models.ingredient import Ingredient

import uuid
from decimal import Decimal
from datetime import date, datetime

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Numeric, ForeignKey, String, Text, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base

class IngredientPurchase(Base):
    __tablename__ = "ingredient_purchases"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False
    )
    ingredient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ingredients.id"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 3), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2,), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2,), nullable=False)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    invoice_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # relationships
    user: Mapped["User"] = relationship("User", back_populates="ingredient_purchases")
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="ingredient_purchases")
    ingredient: Mapped["Ingredient"] = relationship("Ingredient", back_populates="ingredient_purchases")
