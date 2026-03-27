from uuid import UUID

from src.core.exceptions import DuplicateEntityError, NotFoundException
from src.models.ingredient import Ingredient
from src.repositories.ingredient import IngredientRepository
from src.schemas.ingredient import IngredientCreate, IngredientUpdate

# servicio para gestionar ingredientes
class IngredientService:
    def __init__(self, repo: IngredientRepository) -> None:
        self.repo = repo

    # metodo para obtener todos los ingredientes con paginacion
    async def get_all(self, skip: int = 0, limit: int = 100) -> list[Ingredient]:
        return await self.repo.get_all(skip=skip, limit=limit)

    # metodo para contar el total de ingredientes activos
    async def count_all(self) -> int:
        return await self.repo.count_all()

    # metodo para obtener un ingrediente por su id, lanza error si no existe
    async def get_by_id(self, id: UUID) -> Ingredient:
        ingredient = await self.repo.get_by_id(id)
        if not ingredient:
            raise NotFoundException("Ingrediente no encontrado")
        return ingredient

    # metodo para crear un nuevo ingrediente, valida que no exista otro con el mismo nombre
    async def create(self, data: IngredientCreate) -> Ingredient:
        if await self.repo.get_by_name(data.name):
            raise DuplicateEntityError("Ya existe un ingrediente con ese nombre")
        
        ingredient = await self.repo.create(data)
        await self.repo.session.commit()
        return ingredient

    # metodo para actualizar un ingrediente existente, valida cambios de nombre para evitar duplicados
    async def update(self, id: UUID, data: IngredientUpdate) -> Ingredient:
        ingredient = await self.get_by_id(id)

        if data.name and data.name != ingredient.name:
            if await self.repo.get_by_name(data.name):
                raise DuplicateEntityError("Ya existe un ingrediente con ese nombre")
            
        updated = await self.repo.update(ingredient, data)
        await self.repo.session.commit()
        return updated

    # metodo para eliminar un ingrediente, realiza soft delete
    async def delete(self, id: UUID) -> None:
        ingredient = await self.get_by_id(id)
        await self.repo.soft_delete(ingredient)
        await self.repo.session.commit()
