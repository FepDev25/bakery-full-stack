from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.models.enums import ExpenseCategory
from src.schemas._base import DecimalJSON


class ExpenseBase(BaseModel):
    category: ExpenseCategory
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0, decimal_places=2)
    expense_date: date
    invoice_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    category: ExpenseCategory | None = None
    description: str | None = Field(default=None, min_length=1, max_length=255)
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    expense_date: date | None = None
    invoice_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class ExpenseResponse(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    amount: DecimalJSON
    created_at: datetime
