from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.core.dependencies import require_role
from src.models.enums import Role
from src.models.user import User
from src.repositories.customer import CustomerRepository
from src.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
    RedeemPointsRequest,
    RedeemPointsResponse,
)
from src.services.customer import CustomerService
from src.utils.pagination import PaginatedResponse, PaginationParams

# controlador de clientes, gestionados por cajero y admin en el punto de venta
router = APIRouter()
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> CustomerService:
    return CustomerService(CustomerRepository(session))
ServiceDep = Annotated[CustomerService, Depends(get_service)]
# Cajero y admin gestionan clientes en el punto de venta
CajeroOrAdmin = Annotated[User, Depends(require_role(Role.CAJERO, Role.ADMIN, Role.CONTADOR))]
WriteAccess = Annotated[User, Depends(require_role(Role.CAJERO, Role.ADMIN))]
AdminUser = Annotated[User, Depends(require_role(Role.ADMIN))]


@router.get("", response_model=PaginatedResponse[CustomerResponse])
async def list_customers(
    service: ServiceDep,
    _: CajeroOrAdmin,
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[CustomerResponse]:
    items = await service.get_all(skip=pagination.skip, limit=pagination.limit)
    total = await service.count_all()
    return PaginatedResponse.build(items, total, pagination)


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: UUID, service: ServiceDep, _: CajeroOrAdmin) -> CustomerResponse:
    return await service.get_by_id(customer_id)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate, service: ServiceDep, _: WriteAccess
) -> CustomerResponse:
    return await service.create(data)


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: UUID, data: CustomerUpdate, service: ServiceDep, _: WriteAccess
) -> CustomerResponse:
    return await service.update(customer_id, data)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(customer_id: UUID, service: ServiceDep, _: AdminUser) -> None:
    await service.delete(customer_id)


@router.post("/{customer_id}/redeem-points", response_model=RedeemPointsResponse)
async def redeem_points(
    customer_id: UUID,
    data: RedeemPointsRequest,
    service: ServiceDep,
    _: WriteAccess,
) -> RedeemPointsResponse:
    return await service.redeem_points(customer_id, data.points)
