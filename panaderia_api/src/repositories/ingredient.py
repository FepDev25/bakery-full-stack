from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.ingredient import Ingredient
from src.repositories.base import BaseRepository
from src.schemas.ingredient import IngredientCreate, IngredientUpdate


class IngredientRepository(BaseRepository[Ingredient]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Ingredient, session)

    async def get_all(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> list[Ingredient]:
        query = select(Ingredient)
        if active_only:
            query = query.where(Ingredient.is_active == True)
        result = await self.session.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all())

    # metodo para obtener un ingrediente por su ID con bloqueo
    async def get_by_id_with_lock(self, id: UUID) -> Ingredient | None:
        result = await self.session.execute(
            select(Ingredient).where(Ingredient.id == id).with_for_update()
        )
        return result.scalar_one_or_none()

    # metodo para actualizar stock y costo unitario de un ingrediente
    async def update_stock_and_cost(
        self, ingredient: Ingredient, stock_quantity: Decimal, unit_cost: Decimal
    ) -> Ingredient:
        ingredient.stock_quantity = stock_quantity
        ingredient.unit_cost = unit_cost
        await self.session.flush()
        await self.session.refresh(ingredient)
        return ingredient

    async def get_by_name(self, name: str) -> Ingredient | None:
        result = await self.session.execute(
            select(Ingredient).where(Ingredient.name == name)
        )
        return result.scalar_one_or_none()

    async def create(self, data: IngredientCreate) -> Ingredient:
        obj = Ingredient(**data.model_dump())
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, ingredient: Ingredient, data: IngredientUpdate) -> Ingredient:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(ingredient, key, value)
        await self.session.flush()
        await self.session.refresh(ingredient)
        return ingredient

    async def soft_delete(self, ingredient: Ingredient) -> None:
        ingredient.is_active = False
        await self.session.flush()
