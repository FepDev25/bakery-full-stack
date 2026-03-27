from uuid import UUID

from src.core.exceptions import DuplicateEntityError, NotFoundException
from src.models.category import Category
from src.repositories.category import CategoryRepository
from src.schemas.category import CategoryCreate, CategoryUpdate

# servicio de negocio para manejo de categorías
class CategoryService:
    def __init__(self, repo: CategoryRepository) -> None:
        self.repo = repo

    # método para obtener una lista de categorías con paginación
    async def get_all(self, skip: int = 0, limit: int = 100) -> list[Category]:
        return await self.repo.get_all(skip=skip, limit=limit)

    # método para contar el total de categorías, útil para paginación
    async def count_all(self) -> int:
        return await self.repo.count_all()

    # método para obtener una categoría por su ID, con manejo de error si no existe
    async def get_by_id(self, id: UUID) -> Category:
        category = await self.repo.get_by_id(id)
        
        if not category:
            raise NotFoundException("Categoría no encontrada")
        
        return category

    # método para crear una nueva categoría, verificando que no existe otra categoría con el mismo nombre
    async def create(self, data: CategoryCreate) -> Category:
        
        if await self.repo.get_by_name(data.name):
            raise DuplicateEntityError("Ya existe una categoría con ese nombre")
        
        category = await self.repo.create(data)
        await self.repo.session.commit()
        return category

    # método para actualizar una categoría, verificando que no existe otra categoría con el mismo nombre si se intenta cambiar el nombre
    async def update(self, id: UUID, data: CategoryUpdate) -> Category:
        category = await self.get_by_id(id)
        
        if data.name and data.name != category.name:
            if await self.repo.get_by_name(data.name):
                raise DuplicateEntityError("Ya existe una categoría con ese nombre")
        
        updated = await self.repo.update(category, data)
        await self.repo.session.commit()
        return updated

    # soft delete de una categoría, marcándola como inactiva en lugar de eliminarla físicamente de la base de datos
    async def delete(self, id: UUID) -> None:
        category = await self.get_by_id(id)
        await self.repo.soft_delete(category)
        await self.repo.session.commit()
