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

    # metodo para obtener todos los gastos con paginacion
    async def get_all(self, skip: int = 0, limit: int = 100) -> list[Expense]:
        return await self.expense_repo.get_all(skip=skip, limit=limit)

    # mmetodo para obtener el gasto por id
    async def get_by_id(self, id: UUID) -> Expense:
        expense = await self.expense_repo.get_by_id(id)
        if not expense:
            raise NotFoundException("Gasto no encontrado")
        return expense

    # metodo para registrar un nuevo gasto, valida que el usuario exista y esté activo
    async def create(self, data: ExpenseCreate, user_id: UUID) -> Expense:
        user = await self.user_repo.get_by_id(user_id)

        if not user or not user.is_active:
            raise ValidationError("No se puede registrar un gasto para un usuario inactivo")

        expense = await self.expense_repo.create(data, user_id=user_id)
        await self.expense_repo.session.commit()

        # loguea el registro del gasto con detalles relevantes para auditoría
        logger.info(
            "Gasto registrado",
            extra={
                "expense_id": str(expense.id),
                "category": expense.category.value,
                "amount": str(expense.amount),
            },
        )
        return expense

    # metodo para actualizar un gasto existente
    async def update(self, id: UUID, data: ExpenseUpdate) -> Expense:
        expense = await self.get_by_id(id)
        updated = await self.expense_repo.update(expense, data)
        await self.expense_repo.session.commit()
        return updated

    # metodo para eliminar un gasto
    async def delete(self, id: UUID) -> None:
        expense = await self.get_by_id(id)
        await self.expense_repo.delete(expense)
        await self.expense_repo.session.commit()
        logger.info("Gasto eliminado", extra={"expense_id": str(id)})
