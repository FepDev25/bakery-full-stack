from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.enums import SaleStatus
from src.models.sale import Sale
from src.repositories.base import BaseRepository

class SaleRepository(BaseRepository[Sale]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Sale, session)

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> list[Sale]:
        query = select(Sale)
        if from_date:
            query = query.where(Sale.sale_date >= from_date)
        if to_date:
            query = query.where(Sale.sale_date <= to_date)
        result = await self.session.execute(
            query.order_by(Sale.sale_date.desc()).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def count_all(
        self,
        from_date: date | None = None,
        to_date: date | None = None,
    ) -> int:
        query = select(func.count()).select_from(Sale)
        if from_date:
            query = query.where(Sale.sale_date >= from_date)
        if to_date:
            query = query.where(Sale.sale_date <= to_date)
        result = await self.session.execute(query)
        return result.scalar_one()

    async def get_by_id_with_items(self, id: UUID) -> Sale | None:
        result = await self.session.execute(
            select(Sale).where(Sale.id == id).options(selectinload(Sale.items))
        )
        return result.scalar_one_or_none()

    async def get_by_date_range(
        self, from_date: date, to_date: date, skip: int = 0, limit: int = 100
    ) -> list[Sale]:
        result = await self.session.execute(
            select(Sale)
            .where(Sale.sale_date >= from_date, Sale.sale_date <= to_date)
            .order_by(Sale.sale_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    # Genera el siguiente número de venta VTA-YYYY-NNNNN
    # Usa FOR UPDATE en la última venta del año para evitar duplicados en concurrencia
    async def get_next_sale_number(self, year: int) -> str:
        prefix = f"VTA-{year}-"
        result = await self.session.execute(
            select(Sale.sale_number)
            .where(Sale.sale_number.like(f"{prefix}%"))
            .order_by(Sale.sale_number.desc())
            .limit(1)
            .with_for_update(skip_locked=False)
        )
        last = result.scalar_one_or_none()
        seq = (int(last.split("-")[-1]) + 1) if last else 1
        return f"{prefix}{seq:05d}"

    # crear venta con items en una sola transacción
    async def create(
        self,
        user_id: UUID,
        sale_number: str,
        subtotal: Decimal,
        discount_amount: Decimal,
        tax_amount: Decimal,
        total_amount: Decimal,
        payment_method: str,
        customer_id: UUID | None = None,
        notes: str | None = None,
    ) -> Sale:
        from datetime import datetime, timezone
        sale = Sale(
            user_id=user_id,
            customer_id=customer_id,
            sale_number=sale_number,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            payment_method=payment_method,
            status=SaleStatus.COMPLETADA,
            sale_date=datetime.now(timezone.utc),
            notes=notes,
        )
        self.session.add(sale)
        await self.session.flush()
        await self.session.refresh(sale)
        return sale

    async def cancel(self, sale: Sale, notes: str | None = None) -> None:
        sale.status = SaleStatus.CANCELADA
        if notes:
            sale.notes = notes
        await self.session.flush()
