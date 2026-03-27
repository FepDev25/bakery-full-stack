from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.core.dependencies import get_current_user, require_role
from src.models.enums import Role
from src.models.user import User
from src.repositories.category import CategoryRepository
from src.repositories.product import ProductRepository
from src.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from src.services.product import ProductService
from src.utils.pagination import PaginatedResponse, PaginationParams

# controlador de productos
router = APIRouter()

# inyección de dependencias para el servicio de productos, roles de acceso para lectura y escritura
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> ProductService:
    return ProductService(ProductRepository(session), CategoryRepository(session))
ServiceDep = Annotated[ProductService, Depends(get_service)]
AnyAuthUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_role(Role.ADMIN))]


@router.get("", response_model=PaginatedResponse[ProductResponse])
async def list_products(
    service: ServiceDep,
    _: AnyAuthUser,
    pagination: Annotated[PaginationParams, Depends()],
    is_active: bool | None = Query(default=True, description="Filtrar por estado activo/inactivo"),
    search: str | None = Query(default=None, description="Buscar por nombre (parcial)"),
) -> PaginatedResponse[ProductResponse]:
    items = await service.get_all(
        skip=pagination.skip, limit=pagination.limit, is_active=is_active, search=search
    )
    total = await service.count_all(is_active=is_active, search=search)
    return PaginatedResponse.build(items, total, pagination)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: UUID, service: ServiceDep, _: AnyAuthUser) -> ProductResponse:
    return await service.get_by_id(product_id)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(data: ProductCreate, service: ServiceDep, _: AdminUser) -> ProductResponse:
    return await service.create(data)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID, data: ProductUpdate, service: ServiceDep, _: AdminUser
) -> ProductResponse:
    return await service.update(product_id, data)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: UUID, service: ServiceDep, _: AdminUser) -> None:
    await service.delete(product_id)
