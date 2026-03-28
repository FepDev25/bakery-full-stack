from datetime import date
from uuid import UUID

from src.core.exceptions import NotFoundException, ValidationError
from src.core.logging import get_logger
from src.models.expense import Expense
from src.repositories.expense import ExpenseRepository
from src.repositories.user import UserRepository
from src.schemas.expense import ExpenseCreate, ExpenseUpdate

logger = get_logger(__name__)

# servicio para gestionar gastos generales de la panadería, como alquiler, servicios, sueldos, etc
class ExpenseService:
    def __init__(
        self,
        expense_repo: ExpenseRepository,
        user_repo: UserRepository,
    ) -> None:
        self.expense_repo = expense_repo
        self.user_repo = user_repo

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 20,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[Expense]:
        return await self.expense_repo.get_all_filtered(
            skip=skip, limit=limit, from_date=from_date, to_date=to_date
        )

    async def count_all(
        self,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> int:
        return await self.expense_repo.count_filtered(from_date=from_date, to_date=to_date)

    async def get_by_id(self, id: UUID) -> Expense:
        expense = await self.expense_repo.get_by_id(id)
        if not expense:
            raise NotFoundException("Gasto no encontrado")
        return expense

    async def create(self, data: ExpenseCreate, user_id: UUID) -> Expense:
        user = await self.user_repo.get_by_id(user_id)

        if not user or not user.is_active:
            raise ValidationError("No se puede registrar un gasto para un usuario inactivo")

        expense = await self.expense_repo.create(data, user_id=user_id)
        await self.expense_repo.session.commit()

        logger.info(
            "Gasto registrado",
            extra={
                "expense_id": str(expense.id),
                "category": expense.category.value,
                "amount": str(expense.amount),
            },
        )
        return expense

    async def update(self, id: UUID, data: ExpenseUpdate) -> Expense:
        expense = await self.get_by_id(id)
        updated = await self.expense_repo.update(expense, data)
        await self.expense_repo.session.commit()
        return updated

    async def delete(self, id: UUID) -> None:
        expense = await self.get_by_id(id)
        await self.expense_repo.delete(expense)
        await self.expense_repo.session.commit()
        logger.info("Gasto eliminado", extra={"expense_id": str(id)})
