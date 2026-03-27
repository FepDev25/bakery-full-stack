from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.core.dependencies import get_current_user, require_role
from src.models.enums import Role
from src.models.user import User
from src.repositories.ingredient import IngredientRepository
from src.repositories.ingredient_purchase import IngredientPurchaseRepository
from src.repositories.supplier import SupplierRepository
from src.schemas.ingredient_purchase import IngredientPurchaseCreate, IngredientPurchaseResponse
from src.services.purchase import PurchaseService
from src.utils.pagination import PaginatedResponse, PaginationParams

# controlador para compras de ingredientes
router = APIRouter()

# inyección de dependencias para el servicio de compras, y roles de acceso para lectura y escritura
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> PurchaseService:
    return PurchaseService(
        purchase_repo=IngredientPurchaseRepository(session),
        ingredient_repo=IngredientRepository(session),
        supplier_repo=SupplierRepository(session),
    )
ServiceDep = Annotated[PurchaseService, Depends(get_service)]
ReadAccess = Annotated[User, Depends(require_role(Role.ADMIN, Role.CONTADOR))]
WriteAccess = Annotated[User, Depends(require_role(Role.ADMIN, Role.CONTADOR))]


@router.get("", response_model=PaginatedResponse[IngredientPurchaseResponse])
async def list_purchases(
    service: ServiceDep,
    _: ReadAccess,
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[IngredientPurchaseResponse]:
    items = await service.get_all(skip=pagination.skip, limit=pagination.limit)
    total = await service.count_all()
    return PaginatedResponse.build(items, total, pagination)


@router.get("/by-supplier/{supplier_id}", response_model=list[IngredientPurchaseResponse])
async def list_by_supplier(
    supplier_id: UUID,
    service: ServiceDep,
    _: ReadAccess,
    skip: int = 0,
    limit: int = 100,
) -> list[IngredientPurchaseResponse]:
    return await service.get_by_supplier(supplier_id, skip=skip, limit=limit)


@router.get("/by-ingredient/{ingredient_id}", response_model=list[IngredientPurchaseResponse])
async def list_by_ingredient(
    ingredient_id: UUID,
    service: ServiceDep,
    _: ReadAccess,
    skip: int = 0,
    limit: int = 100,
) -> list[IngredientPurchaseResponse]:
    return await service.get_by_ingredient(ingredient_id, skip=skip, limit=limit)


@router.post("", response_model=IngredientPurchaseResponse, status_code=status.HTTP_201_CREATED)
async def register_purchase(
    data: IngredientPurchaseCreate,
    service: ServiceDep,
    current_user: Annotated[User, Depends(get_current_user)],
    _: WriteAccess,
) -> IngredientPurchaseResponse:
    return await service.register_purchase(data, user_id=current_user.id)
