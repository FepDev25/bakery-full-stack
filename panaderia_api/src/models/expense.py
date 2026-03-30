from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.models.user import User

import uuid
from decimal import Decimal
from datetime import date, datetime

from sqlalchemy import String, Numeric, Date, Text, DateTime, func, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.models.enums import ExpenseCategory


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    category: Mapped[ExpenseCategory] = mapped_column(
        SAEnum(
            ExpenseCategory,
            name="expense_category",
            values_callable=lambda objs: [e.value for e in objs],
            create_type=False,
            native_enum=False,
        ),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    expense_date: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=func.current_date()
    )
    invoice_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # relationships
    user: Mapped["User"] = relationship("User", back_populates="expenses")
