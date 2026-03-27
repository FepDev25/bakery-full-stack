from decimal import Decimal
from uuid import UUID

from src.core.exceptions import DuplicateEntityError, NotFoundException, ValidationError
from src.models.customer import Customer
from src.repositories.customer import CustomerRepository
from src.schemas.customer import CustomerCreate, CustomerUpdate, RedeemPointsResponse

# 100 puntos = $10 de descuento → 1 punto = $0.10
_POINTS_TO_PESO = Decimal("0.10")

# clase de servicio para clientes
class CustomerService:
    def __init__(self, repo: CustomerRepository) -> None:
        self.repo = repo

    # listar clientes con paginación
    async def get_all(self, skip: int = 0, limit: int = 100) -> list[Customer]:
        return await self.repo.get_all(skip=skip, limit=limit)

    # contar clientes para paginación
    async def count_all(self) -> int:
        return await self.repo.count_all()

    # obtener cliente por id, lanzar excepción si no existe
    async def get_by_id(self, id: UUID) -> Customer:
        customer = await self.repo.get_by_id(id)

        if not customer:
            raise NotFoundException("Cliente no encontrado")
        
        return customer

    # crear cliente, validar email y teléfono duplicados
    async def create(self, data: CustomerCreate) -> Customer:
        
        if data.email and await self.repo.get_by_email(data.email):
            raise DuplicateEntityError("Ya existe un cliente con ese correo electrónico")
        
        if data.phone and await self.repo.get_by_phone(data.phone):
            raise DuplicateEntityError("Ya existe un cliente con ese teléfono")
        
        customer = await self.repo.create(data)
        await self.repo.session.commit()
        return customer

    # actualizar cliente, validar cambios de email y teléfono duplicados
    async def update(self, id: UUID, data: CustomerUpdate) -> Customer:
        customer = await self.get_by_id(id)
        
        if data.email and data.email != customer.email:
            if await self.repo.get_by_email(data.email):
                raise DuplicateEntityError("Ya existe un cliente con ese correo electrónico")
        
        if data.phone and data.phone != customer.phone:
            if await self.repo.get_by_phone(data.phone):
                raise DuplicateEntityError("Ya existe un cliente con ese teléfono")
        
        updated = await self.repo.update(customer, data)
        await self.repo.session.commit()
        return updated

    # eliminar cliente
    async def delete(self, id: UUID) -> None:
        customer = await self.get_by_id(id)
        await self.repo.soft_delete(customer)
        await self.repo.session.commit()

    # canjear puntos por descuento, validar que el cliente tenga suficientes puntos
    async def redeem_points(self, id: UUID, points_to_redeem: int) -> RedeemPointsResponse:
        customer = await self.get_by_id(id)
        if points_to_redeem > customer.loyalty_points:
            raise ValidationError(
                f"Puntos insuficientes: el cliente tiene {customer.loyalty_points}, "
                f"se intentan canjear {points_to_redeem}"
            )
        discount = Decimal(points_to_redeem) * _POINTS_TO_PESO
        remaining = customer.loyalty_points - points_to_redeem
        await self.repo.update_loyalty_points(customer, remaining)
        await self.repo.session.commit()
        # devolver descuento y puntos restantes
        return RedeemPointsResponse(discount_amount=discount, remaining_points=remaining)
