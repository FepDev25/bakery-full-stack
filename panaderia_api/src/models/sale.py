from __future__ import annotations
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from src.models.customer import Customer
    from src.models.user import User

import uuid
from decimal import Decimal
from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, Numeric, DateTime, ForeignKey, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Enum as SAEnum

from src.core.database import Base
from src.models.enums import PaymentMethod, SaleStatus

class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    sale_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        SAEnum(PaymentMethod, name="payment_method"),
        nullable=False,
        default=PaymentMethod.EFECTIVO
    )
    status: Mapped[SaleStatus] = mapped_column(
        SAEnum(SaleStatus, name="sale_status"),
        nullable=False,
        default=SaleStatus.COMPLETADA
    )
    sale_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # relationships
    customer: Mapped["Customer"] = relationship("Customer", back_populates="sales")
    user: Mapped["User"] = relationship("User", back_populates="sales")
