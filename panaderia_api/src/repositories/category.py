from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.category import Category
from src.repositories.base import BaseRepository
from src.schemas.category import CategoryCreate, CategoryUpdate


class CategoryRepository(BaseRepository[Category]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Category, session)

    async def get_all(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> list[Category]:
        query = select(Category)
        if active_only:
            query = query.where(Category.is_active == True)
        result = await self.session.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all())

    async def get_by_name(self, name: str) -> Category | None:
        result = await self.session.execute(
            select(Category).where(Category.name == name)
        )
        return result.scalar_one_or_none()

    async def create(self, data: CategoryCreate) -> Category:
        obj = Category(**data.model_dump())
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, category: Category, data: CategoryUpdate) -> Category:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(category, key, value)
        await self.session.flush()
        await self.session.refresh(category)
        return category

    async def soft_delete(self, category: Category) -> None:
        category.is_active = False
        await self.session.flush()
