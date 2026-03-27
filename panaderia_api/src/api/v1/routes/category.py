# controlador de categorías, con endpoints para CRUD de categorías

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.repositories.category import CategoryRepository
from src.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from src.services.category import CategoryService
from src.utils.pagination import PaginatedResponse, PaginationParams

router = APIRouter()

# inyección de dependencias para obtener el servicio de categoría a partir de la sesión de base de datos
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> CategoryService:
    return CategoryService(CategoryRepository(session))
ServiceDep = Annotated[CategoryService, Depends(get_service)]

# endpoint para listar categorías con paginación, devolviendo una respuesta paginada con la 
# lista de categorías y el total de categorías para calcular el número de páginas
@router.get("", response_model=PaginatedResponse[CategoryResponse])
async def list_categories(
    service: ServiceDep,
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[CategoryResponse]:
    items = await service.get_all(skip=pagination.skip, limit=pagination.limit)
    total = await service.count_all()
    return PaginatedResponse.build(items, total, pagination)

# endpoint para obtener una categoría por su ID, devolviendo un error 404 si no existe
@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: UUID, service: ServiceDep) -> CategoryResponse:
    return await service.get_by_id(category_id)

# endpoints para crear y actualizar categorias
@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(data: CategoryCreate, service: ServiceDep) -> CategoryResponse:
    return await service.create(data)

@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: UUID, data: CategoryUpdate, service: ServiceDep) -> CategoryResponse:
    return await service.update(category_id, data)

# endpoint para eliminar una categoría,
@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(category_id: UUID, service: ServiceDep) -> None:
    await service.delete(category_id)
