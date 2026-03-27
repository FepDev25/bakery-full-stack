from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.sale_item import SaleItem
from src.repositories.base import BaseRepository


class SaleItemRepository(BaseRepository[SaleItem]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(SaleItem, session)

    async def get_by_sale(self, sale_id: UUID) -> list[SaleItem]:
        result = await self.session.execute(
            select(SaleItem).where(SaleItem.sale_id == sale_id)
        )
        return list(result.scalars().all())

    # Crear múltiples items de venta en una sola transacción
    async def create_bulk(
        self,
        sale_id: UUID,
        items: list[dict],  # [{product_id, quantity, unit, unit_price, subtotal}]
    ) -> list[SaleItem]:
        objs = [
            SaleItem(
                sale_id=sale_id,
                product_id=item["product_id"],
                quantity=item["quantity"],
                unit=item["unit"],
                unit_price=item["unit_price"],
                subtotal=item["subtotal"],
            )
            for item in items
        ]
        self.session.add_all(objs)
        await self.session.flush()
        for obj in objs:
            await self.session.refresh(obj)
        return objs
