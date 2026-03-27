from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.repositories.ingredient import IngredientRepository
from src.schemas.ingredient import IngredientCreate, IngredientResponse, IngredientUpdate
from src.services.ingredient import IngredientService
from src.utils.pagination import PaginatedResponse, PaginationParams

# controlador de ingredientes
router = APIRouter()

# inyección de dependencias para el servicio de ingredientes
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> IngredientService:
    return IngredientService(IngredientRepository(session))
ServiceDep = Annotated[IngredientService, Depends(get_service)]

@router.get("", response_model=PaginatedResponse[IngredientResponse])
async def list_ingredients(
    service: ServiceDep,
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[IngredientResponse]:
    items = await service.get_all(skip=pagination.skip, limit=pagination.limit)
    total = await service.count_all()
    return PaginatedResponse.build(items, total, pagination)


@router.get("/{ingredient_id}", response_model=IngredientResponse)
async def get_ingredient(ingredient_id: UUID, service: ServiceDep) -> IngredientResponse:
    return await service.get_by_id(ingredient_id)


@router.post("", response_model=IngredientResponse, status_code=status.HTTP_201_CREATED)
async def create_ingredient(data: IngredientCreate, service: ServiceDep) -> IngredientResponse:
    return await service.create(data)


@router.patch("/{ingredient_id}", response_model=IngredientResponse)
async def update_ingredient(ingredient_id: UUID, data: IngredientUpdate, service: ServiceDep) -> IngredientResponse:
    return await service.update(ingredient_id, data)


@router.delete("/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ingredient(ingredient_id: UUID, service: ServiceDep) -> None:
    await service.delete(ingredient_id)
