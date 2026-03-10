from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.product import Product
from src.repositories.base import BaseRepository
from src.schemas.product import ProductCreate, ProductUpdate


class ProductRepository(BaseRepository[Product]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Product, session)

    async def get_all(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> list[Product]:
        query = select(Product)
        if active_only:
            query = query.where(Product.is_active == True)
        result = await self.session.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all())

    async def get_by_category(self, category_id: UUID, skip: int = 0, limit: int = 100) -> list[Product]:
        result = await self.session.execute(
            select(Product)
            .where(Product.category_id == category_id, Product.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, data: ProductCreate) -> Product:
        obj = Product(**data.model_dump())
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, product: Product, data: ProductUpdate) -> Product:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(product, key, value)
        await self.session.flush()
        await self.session.refresh(product)
        return product

    async def soft_delete(self, product: Product) -> None:
        product.is_active = False
        await self.session.flush()
