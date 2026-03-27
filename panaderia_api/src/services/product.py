from uuid import UUID

from src.core.exceptions import DeleteConstraintError, DuplicateEntityError, NotFoundException
from src.models.product import Product
from src.repositories.category import CategoryRepository
from src.repositories.product import ProductRepository
from src.schemas.product import ProductCreate, ProductUpdate

# clase de servicio para productos
class ProductService:
    def __init__(self, repo: ProductRepository, category_repo: CategoryRepository) -> None:
        self.repo = repo
        self.category_repo = category_repo

    # listar productos con paginación, filtro por estado y búsqueda por nombre
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = True,
        search: str | None = None,
    ) -> list[Product]:
        return await self.repo.get_all(skip=skip, limit=limit, is_active=is_active, search=search)

    # contar productos para paginación
    async def count_all(self, is_active: bool | None = True, search: str | None = None) -> int:
        return await self.repo.count_all(is_active=is_active, search=search)

    # obtener producto por id, lanzar excepción si no existe
    async def get_by_id(self, id: UUID) -> Product:
        product = await self.repo.get_by_id(id)
        if not product:
            raise NotFoundException("Producto no encontrado")
        return product

    # crear producto, validar categoría y nombre duplicado
    async def create(self, data: ProductCreate) -> Product:
        category = await self.category_repo.get_by_id(data.category_id)

        if not category or not category.is_active:
            raise NotFoundException("Categoría no encontrada o inactiva")
        
        if await self.repo.get_by_name_in_category(data.name, data.category_id):
            raise DuplicateEntityError("Ya existe un producto con ese nombre en la categoría")
        
        product = await self.repo.create(data)
        await self.repo.session.commit()
        return product

    # actualizar producto, validar cambios de categoría y nombre duplicado
    async def update(self, id: UUID, data: ProductUpdate) -> Product:
        product = await self.get_by_id(id)
        
        # Validar nueva categoría si cambia
        new_category_id = data.category_id or product.category_id
        if data.category_id and data.category_id != product.category_id:
            category = await self.category_repo.get_by_id(data.category_id)
            if not category or not category.is_active:
                raise NotFoundException("Categoría no encontrada o inactiva")
        
        # Validar nombre duplicado si cambia nombre o categoría
        new_name = data.name or product.name
        if data.name or data.category_id:
            existing = await self.repo.get_by_name_in_category(new_name, new_category_id)
            if existing and existing.id != product.id:
                raise DuplicateEntityError("Ya existe un producto con ese nombre en la categoría")
        
        updated = await self.repo.update(product, data)
        await self.repo.session.commit()
        return updated

    # eliminar producto, validar que no tenga stock disponible
    async def delete(self, id: UUID) -> None:
        product = await self.get_by_id(id)

        # no desactivar si tiene stock
        if product.stock_quantity > 0:
            raise DeleteConstraintError(
                f"No se puede desactivar el producto '{product.name}': tiene stock disponible ({product.stock_quantity})"
            )
        
        await self.repo.soft_delete(product)
        await self.repo.session.commit()
