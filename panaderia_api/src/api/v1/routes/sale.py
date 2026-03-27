from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.core.dependencies import get_current_user, require_role
from src.models.enums import Role
from src.models.user import User
from src.repositories.customer import CustomerRepository
from src.repositories.product import ProductRepository
from src.repositories.sale import SaleRepository
from src.repositories.sale_item import SaleItemRepository
from src.schemas.sale import SaleCancel, SaleCreate, SaleResponse, SaleWithItemsResponse
from src.services.sale import SaleService
from src.utils.pagination import PaginatedResponse, PaginationParams

# controlador de ventas
router = APIRouter()

# inyección de dependencias para el servicio de ventas
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> SaleService:
    return SaleService(
        sale_repo=SaleRepository(session),
        sale_item_repo=SaleItemRepository(session),
        product_repo=ProductRepository(session),
        customer_repo=CustomerRepository(session),
    )
# roles de acceso
ServiceDep = Annotated[SaleService, Depends(get_service)]
ReadAccess = Annotated[User, Depends(require_role(Role.CAJERO, Role.ADMIN, Role.CONTADOR))]
WriteAccess = Annotated[User, Depends(require_role(Role.CAJERO, Role.ADMIN))]


@router.get("", response_model=PaginatedResponse[SaleResponse])
async def list_sales(
    service: ServiceDep,
    _: ReadAccess,
    pagination: Annotated[PaginationParams, Depends()],
    from_date: date | None = Query(default=None, description="Fecha inicio (YYYY-MM-DD)"),
    to_date: date | None = Query(default=None, description="Fecha fin (YYYY-MM-DD)"),
) -> PaginatedResponse[SaleResponse]:
    items = await service.get_all(
        skip=pagination.skip, limit=pagination.limit, from_date=from_date, to_date=to_date
    )
    total = await service.count_all(from_date=from_date, to_date=to_date)
    return PaginatedResponse.build(items, total, pagination)


@router.get("/{sale_id}", response_model=SaleWithItemsResponse)
async def get_sale(sale_id: UUID, service: ServiceDep, _: ReadAccess) -> SaleWithItemsResponse:
    return await service.get_by_id(sale_id)


@router.post("", response_model=SaleWithItemsResponse, status_code=status.HTTP_201_CREATED)
async def create_sale(
    data: SaleCreate,
    service: ServiceDep,
    current_user: Annotated[User, Depends(get_current_user)],
    _: WriteAccess,
) -> SaleWithItemsResponse:
    return await service.create_sale(data, user_id=current_user.id)


@router.post("/{sale_id}/cancel", response_model=SaleWithItemsResponse)
async def cancel_sale(
    sale_id: UUID,
    data: SaleCancel,
    service: ServiceDep,
    _: WriteAccess,
) -> SaleWithItemsResponse:
    return await service.cancel_sale(sale_id, data)
