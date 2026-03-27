from uuid import UUID

from src.core.exceptions import DuplicateEntityError, NotFoundException
from src.models.supplier import Supplier
from src.repositories.supplier import SupplierRepository
from src.schemas.supplier import SupplierCreate, SupplierUpdate

# servicio para gestionar proveedores
class SupplierService:
    def __init__(self, repo: SupplierRepository) -> None:
        self.repo = repo

    # metodo para obtener todos los proveedores con paginacion
    async def get_all(self, skip: int = 0, limit: int = 100) -> list[Supplier]:
        return await self.repo.get_all(skip=skip, limit=limit)

    # metodo para contar el total de proveedores activos
    async def count_all(self) -> int:
        return await self.repo.count_all()

    # metodo para obtener un proveedor por su id, lanza error si no existe
    async def get_by_id(self, id: UUID) -> Supplier:
        supplier = await self.repo.get_by_id(id)
        if not supplier:
            raise NotFoundException("Proveedor no encontrado")
        return supplier

    # metodo para crear un nuevo proveedor, valida que no exista otro con el mismo nombre o tax_id
    async def create(self, data: SupplierCreate) -> Supplier:

        if await self.repo.get_by_name(data.name):
            raise DuplicateEntityError("Ya existe un proveedor con ese nombre")
        
        if data.tax_id and await self.repo.get_by_tax_id(data.tax_id):
            raise DuplicateEntityError("Ya existe un proveedor con ese RUC/CUIT")
        
        supplier = await self.repo.create(data)
        await self.repo.session.commit()
        return supplier

    # metodo para actualizar un proveedor existente, valida cambios de nombre o tax_id para evitar duplicados
    async def update(self, id: UUID, data: SupplierUpdate) -> Supplier:
        supplier = await self.get_by_id(id)

        if data.name and data.name != supplier.name:
            if await self.repo.get_by_name(data.name):
                raise DuplicateEntityError("Ya existe un proveedor con ese nombre")
            
        if data.tax_id and data.tax_id != supplier.tax_id:
            if await self.repo.get_by_tax_id(data.tax_id):
                raise DuplicateEntityError("Ya existe un proveedor con ese RUC/CUIT")
            
        updated = await self.repo.update(supplier, data)
        await self.repo.session.commit()
        return updated

    # metodo para eliminar un proveedor, realiza soft delete
    async def delete(self, id: UUID) -> None:
        supplier = await self.get_by_id(id)
        await self.repo.soft_delete(supplier)
        await self.repo.session.commit()
