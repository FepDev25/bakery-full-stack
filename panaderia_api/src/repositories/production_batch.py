from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import ProductionBatchStatus
from src.models.production_batch import ProductionBatch
from src.repositories.base import BaseRepository
from src.schemas.production_batch import ProductionBatchCreate


class ProductionBatchRepository(BaseRepository[ProductionBatch]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(ProductionBatch, session)

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[ProductionBatch]:
        result = await self.session.execute(
            select(ProductionBatch)
            .order_by(ProductionBatch.production_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_product(
        self, product_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[ProductionBatch]:
        result = await self.session.execute(
            select(ProductionBatch)
            .where(ProductionBatch.product_id == product_id)
            .order_by(ProductionBatch.production_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(
        self, data: ProductionBatchCreate, user_id: UUID
    ) -> ProductionBatch:
        batch = ProductionBatch(
            product_id=data.product_id,
            user_id=user_id,
            quantity_produced=data.quantity_produced,
            unit=data.unit,
            production_date=data.production_date,
            notes=data.notes,
            ingredient_cost=Decimal("0.00"),
            status=ProductionBatchStatus.EN_PROCESO,
        )
        self.session.add(batch)
        await self.session.flush()
        await self.session.refresh(batch)
        return batch

    async def complete(self, batch: ProductionBatch, ingredient_cost: Decimal) -> None:
        batch.status = ProductionBatchStatus.COMPLETADO
        batch.ingredient_cost = ingredient_cost
        await self.session.flush()
        await self.session.refresh(batch)

    async def discard(self, batch: ProductionBatch, ingredient_cost: Decimal) -> None:
        batch.status = ProductionBatchStatus.DESCARTADO
        batch.ingredient_cost = ingredient_cost
        await self.session.flush()
        await self.session.refresh(batch)
