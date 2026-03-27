from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.recipe import Recipe
from src.repositories.base import BaseRepository
from src.schemas.recipe import RecipeCreate, RecipeUpdate


class RecipeRepository(BaseRepository[Recipe]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Recipe, session)

    # cargar las recetas de un producto con sus ingredientes en una sola query
    async def get_by_product_with_ingredients(self, product_id: UUID) -> list[Recipe]:
        result = await self.session.execute(
            select(Recipe)
            .where(Recipe.product_id == product_id)
            .options(selectinload(Recipe.ingredient))
        )
        return list(result.scalars().all())

    async def get_by_product(self, product_id: UUID) -> list[Recipe]:
        result = await self.session.execute(
            select(Recipe).where(Recipe.product_id == product_id)
        )
        return list(result.scalars().all())

    async def get_by_product_and_ingredient(self, product_id: UUID, ingredient_id: UUID) -> Recipe | None:
        result = await self.session.execute(
            select(Recipe).where(
                Recipe.product_id == product_id,
                Recipe.ingredient_id == ingredient_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(self, data: RecipeCreate) -> Recipe:
        obj = Recipe(**data.model_dump())
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, recipe: Recipe, data: RecipeUpdate) -> Recipe:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(recipe, key, value)
        await self.session.flush()
        await self.session.refresh(recipe)
        return recipe
