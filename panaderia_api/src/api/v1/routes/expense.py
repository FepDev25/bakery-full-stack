from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.core.dependencies import get_current_user, require_role
from src.models.enums import Role
from src.models.user import User
from src.repositories.expense import ExpenseRepository
from src.repositories.user import UserRepository
from src.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseUpdate
from src.services.expense import ExpenseService

# controlador de gastos, gestionados por admin y contador
router = APIRouter()

# inyección de dependencias para el servicio de gastos
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> ExpenseService:
    return ExpenseService(
        expense_repo=ExpenseRepository(session),
        user_repo=UserRepository(session),
    )
ServiceDep = Annotated[ExpenseService, Depends(get_service)]
ReadAccess = Annotated[User, Depends(require_role(Role.ADMIN, Role.CONTADOR))]
WriteAccess = Annotated[User, Depends(require_role(Role.ADMIN, Role.CONTADOR))]


@router.get("", response_model=list[ExpenseResponse])
async def list_expenses(
    service: ServiceDep,
    _: ReadAccess,
    skip: int = 0,
    limit: int = 100,
) -> list[ExpenseResponse]:
    return await service.get_all(skip=skip, limit=limit)


@router.get("/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: UUID,
    service: ServiceDep,
    _: ReadAccess,
) -> ExpenseResponse:
    return await service.get_by_id(expense_id)


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    service: ServiceDep,
    current_user: Annotated[User, Depends(get_current_user)],
    _: WriteAccess,
) -> ExpenseResponse:
    return await service.create(data, user_id=current_user.id)


@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: UUID,
    data: ExpenseUpdate,
    service: ServiceDep,
    _: WriteAccess,
) -> ExpenseResponse:
    return await service.update(expense_id, data)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: UUID,
    service: ServiceDep,
    _: WriteAccess,
) -> None:
    await service.delete(expense_id)
