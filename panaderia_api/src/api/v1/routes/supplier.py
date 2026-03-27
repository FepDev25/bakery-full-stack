from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.repositories.supplier import SupplierRepository
from src.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate
from src.services.supplier import SupplierService
from src.utils.pagination import PaginatedResponse, PaginationParams

# controller de proveedores
router = APIRouter()

# inyección de dependencias para el servicio de proveedores
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> SupplierService:
    return SupplierService(SupplierRepository(session))
ServiceDep = Annotated[SupplierService, Depends(get_service)]


@router.get("", response_model=PaginatedResponse[SupplierResponse])
async def list_suppliers(
    service: ServiceDep,
    pagination: Annotated[PaginationParams, Depends()],
) -> PaginatedResponse[SupplierResponse]:
    items = await service.get_all(skip=pagination.skip, limit=pagination.limit)
    total = await service.count_all()
    return PaginatedResponse.build(items, total, pagination)


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(supplier_id: UUID, service: ServiceDep) -> SupplierResponse:
    return await service.get_by_id(supplier_id)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(data: SupplierCreate, service: ServiceDep) -> SupplierResponse:
    return await service.create(data)


@router.patch("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(supplier_id: UUID, data: SupplierUpdate, service: ServiceDep) -> SupplierResponse:
    return await service.update(supplier_id, data)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supplier(supplier_id: UUID, service: ServiceDep) -> None:
    await service.delete(supplier_id)
