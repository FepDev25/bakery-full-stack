from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.ingredient_purchase import IngredientPurchase
from src.repositories.base import BaseRepository
from src.schemas.ingredient_purchase import IngredientPurchaseCreate


class IngredientPurchaseRepository(BaseRepository[IngredientPurchase]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(IngredientPurchase, session)

    async def get_all(self, skip: int = 0, limit: int = 100) -> list[IngredientPurchase]:
        result = await self.session.execute(
            select(IngredientPurchase)
            .order_by(IngredientPurchase.purchase_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    # obtener compras por proveedor o ingrediente, ordenadas por fecha de compra descendente
    async def get_by_supplier(
        self, supplier_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[IngredientPurchase]:
        result = await self.session.execute(
            select(IngredientPurchase)
            .where(IngredientPurchase.supplier_id == supplier_id)
            .order_by(IngredientPurchase.purchase_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_ingredient(
        self, ingredient_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[IngredientPurchase]:
        result = await self.session.execute(
            select(IngredientPurchase)
            .where(IngredientPurchase.ingredient_id == ingredient_id)
            .order_by(IngredientPurchase.purchase_date.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    # crear una compra de ingrediente, calculando el monto total antes de guardar
    async def create(
        self, data: IngredientPurchaseCreate, user_id: UUID, total_amount: Decimal
    ) -> IngredientPurchase:
        purchase = IngredientPurchase(
            supplier_id=data.supplier_id,
            ingredient_id=data.ingredient_id,
            user_id=user_id,
            quantity=data.quantity,
            unit=data.unit.value,
            unit_price=data.unit_price,
            total_amount=total_amount,
            purchase_date=data.purchase_date,
            invoice_number=data.invoice_number,
            notes=data.notes,
        )
        self.session.add(purchase)
        await self.session.flush()
        await self.session.refresh(purchase)
        return purchase
