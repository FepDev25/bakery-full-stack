from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.supplier import Supplier
from src.repositories.base import BaseRepository
from src.schemas.supplier import SupplierCreate, SupplierUpdate


class SupplierRepository(BaseRepository[Supplier]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Supplier, session)

    async def get_all(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> list[Supplier]:
        query = select(Supplier)
        if active_only:
            query = query.where(Supplier.is_active == True)
        result = await self.session.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all())

    async def get_by_name(self, name: str) -> Supplier | None:
        result = await self.session.execute(
            select(Supplier).where(Supplier.name == name)
        )
        return result.scalar_one_or_none()

    async def get_by_tax_id(self, tax_id: str) -> Supplier | None:
        result = await self.session.execute(
            select(Supplier).where(Supplier.tax_id == tax_id)
        )
        return result.scalar_one_or_none()

    async def create(self, data: SupplierCreate) -> Supplier:
        obj = Supplier(**data.model_dump())
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, supplier: Supplier, data: SupplierUpdate) -> Supplier:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(supplier, key, value)
        await self.session.flush()
        await self.session.refresh(supplier)
        return supplier

    async def soft_delete(self, supplier: Supplier) -> None:
        supplier.is_active = False
        await self.session.flush()
