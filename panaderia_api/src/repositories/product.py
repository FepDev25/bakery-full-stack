from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.product import Product
from src.repositories.base import BaseRepository
from src.schemas.product import ProductCreate, ProductUpdate

class ProductRepository(BaseRepository[Product]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Product, session)

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = True,
        search: str | None = None,
    ) -> list[Product]:
        query = select(Product)
        if is_active is not None:
            query = query.where(Product.is_active == is_active)
        if search:
            query = query.where(Product.name.ilike(f"%{search}%"))
        result = await self.session.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all())

    # Contar total de productos para paginación
    async def count_all(
        self,
        is_active: bool | None = True,
        search: str | None = None,
    ) -> int:
        query = select(func.count()).select_from(Product)
        if is_active is not None:
            query = query.where(Product.is_active == is_active)
        if search:
            query = query.where(Product.name.ilike(f"%{search}%"))
        result = await self.session.execute(query)
        return result.scalar_one()

    async def get_by_category(self, category_id: UUID, skip: int = 0, limit: int = 100) -> list[Product]:
        result = await self.session.execute(
            select(Product)
            .where(Product.category_id == category_id, Product.is_active == True)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    # Obtener producto por ID con bloqueo para evitar condiciones de carrera en actualizaciones
    async def get_by_id_with_lock(self, id: UUID) -> Product | None:
        result = await self.session.execute(
            select(Product).where(Product.id == id).with_for_update()
        )
        return result.scalar_one_or_none()

    # Verificar si ya existe un producto con el mismo nombre en la categoría
    async def get_by_name_in_category(self, name: str, category_id: UUID) -> Product | None:
        result = await self.session.execute(
            select(Product).where(Product.name == name, Product.category_id == category_id)
        )
        return result.scalar_one_or_none()

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
