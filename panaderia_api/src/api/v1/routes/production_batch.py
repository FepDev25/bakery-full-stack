from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.core.dependencies import get_current_user, require_role
from src.models.enums import Role
from src.models.user import User
from src.repositories.ingredient import IngredientRepository
from src.repositories.production_batch import ProductionBatchRepository
from src.repositories.product import ProductRepository
from src.repositories.recipe import RecipeRepository
from src.schemas.production_batch import ProductionBatchCreate, ProductionBatchResponse
from src.services.production import ProductionService
from src.utils.pagination import PaginatedResponse, PaginationParams

# controlador para lotes de producción
router = APIRouter()

# inyeccion de dependencias para el servicio de lotes de producción, y roles de acceso para lectura y escritura
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> ProductionService:
    return ProductionService(
        batch_repo=ProductionBatchRepository(session),
        product_repo=ProductRepository(session),
        ingredient_repo=IngredientRepository(session),
        recipe_repo=RecipeRepository(session),
    )
ServiceDep = Annotated[ProductionService, Depends(get_service)]
ReadAccess = Annotated[User, Depends(require_role(Role.PANADERO, Role.ADMIN, Role.CONTADOR))]
WriteAccess = Annotated[User, Depends(require_role(Role.PANADERO, Role.ADMIN))]


@router.get("", response_model=PaginatedResponse[ProductionBatchResponse])
async def list_batches(
    service: ServiceDep,
    _: ReadAccess,
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[ProductionBatchResponse]:
    items = await service.get_all(skip=pagination.skip, limit=pagination.limit)
    total = await service.count_all()
    return PaginatedResponse.build(items, total, pagination)


@router.get("/{batch_id}", response_model=ProductionBatchResponse)
async def get_batch(
    batch_id: UUID,
    service: ServiceDep,
    _: ReadAccess,
) -> ProductionBatchResponse:
    return await service.get_by_id(batch_id)


@router.post("", response_model=ProductionBatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    data: ProductionBatchCreate,
    service: ServiceDep,
    current_user: Annotated[User, Depends(get_current_user)],
    _: WriteAccess,
) -> ProductionBatchResponse:
    return await service.create_batch(data, user_id=current_user.id)


@router.post("/{batch_id}/complete", response_model=ProductionBatchResponse)
async def complete_batch(
    batch_id: UUID,
    service: ServiceDep,
    _: WriteAccess,
) -> ProductionBatchResponse:
    return await service.complete_batch(batch_id)


@router.post("/{batch_id}/discard", response_model=ProductionBatchResponse)
async def discard_batch(
    batch_id: UUID,
    service: ServiceDep,
    _: WriteAccess,
) -> ProductionBatchResponse:
    return await service.discard_batch(batch_id)
