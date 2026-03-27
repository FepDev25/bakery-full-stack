from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.core.dependencies import require_role
from src.models.enums import Role
from src.models.user import User
from src.repositories.ingredient import IngredientRepository
from src.repositories.product import ProductRepository
from src.repositories.recipe import RecipeRepository
from src.schemas.recipe import ProductionCostResponse, RecipeCreate, RecipeResponse, RecipeUpdate
from src.services.recipe import RecipeService

# controlador de recetas
router = APIRouter()

# inyección de dependencias para el servicio de recetas
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> RecipeService:
    return RecipeService(
        recipe_repo=RecipeRepository(session),
        product_repo=ProductRepository(session),
        ingredient_repo=IngredientRepository(session),
    )
ServiceDep = Annotated[RecipeService, Depends(get_service)]
# roles de acceso para lectura y escritura
ReadAccess = Annotated[User, Depends(require_role(Role.PANADERO, Role.ADMIN, Role.CONTADOR))]
WriteAccess = Annotated[User, Depends(require_role(Role.PANADERO, Role.ADMIN))]


@router.get("/product/{product_id}", response_model=list[RecipeResponse])
async def list_recipes_by_product(
    product_id: UUID,
    service: ServiceDep,
    _: ReadAccess,
) -> list[RecipeResponse]:
    return await service.get_by_product(product_id)


@router.get("/product/{product_id}/cost", response_model=ProductionCostResponse)
async def get_production_cost(
    product_id: UUID,
    service: ServiceDep,
    _: ReadAccess,
) -> ProductionCostResponse:
    return await service.get_unit_production_cost(product_id)


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(
    recipe_id: UUID,
    service: ServiceDep,
    _: ReadAccess,
) -> RecipeResponse:
    return await service.get_by_id(recipe_id)


@router.post("", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
async def create_recipe(
    data: RecipeCreate,
    service: ServiceDep,
    _: WriteAccess,
) -> RecipeResponse:
    return await service.create(data)


@router.patch("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(
    recipe_id: UUID,
    data: RecipeUpdate,
    service: ServiceDep,
    _: WriteAccess,
) -> RecipeResponse:
    return await service.update(recipe_id, data)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(
    recipe_id: UUID,
    service: ServiceDep,
    _: WriteAccess,
) -> None:
    await service.delete(recipe_id)
