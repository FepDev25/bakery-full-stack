from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.expense import Expense
from src.repositories.base import BaseRepository
from src.schemas.expense import ExpenseCreate, ExpenseUpdate


class ExpenseRepository(BaseRepository[Expense]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Expense, session)

    async def get_all_filtered(
        self,
        skip: int = 0,
        limit: int = 20,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[Expense]:
        query = select(Expense)
        if from_date:
            query = query.where(Expense.expense_date >= from_date)
        if to_date:
            query = query.where(Expense.expense_date <= to_date)
        query = query.order_by(Expense.expense_date.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def count_filtered(
        self,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> int:
        query = select(func.count()).select_from(Expense)
        if from_date:
            query = query.where(Expense.expense_date >= from_date)
        if to_date:
            query = query.where(Expense.expense_date <= to_date)
        result = await self.session.execute(query)
        return result.scalar_one()

    async def get_by_user(self, user_id: UUID, skip: int = 0, limit: int = 100) -> list[Expense]:
        result = await self.session.execute(
            select(Expense)
            .where(Expense.user_id == user_id)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, data: ExpenseCreate, user_id: UUID) -> Expense:
        obj = Expense(**data.model_dump(), user_id=user_id)
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, expense: Expense, data: ExpenseUpdate) -> Expense:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(expense, key, value)
        await self.session.flush()
        await self.session.refresh(expense)
        return expense
