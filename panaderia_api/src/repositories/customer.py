from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.customer import Customer
from src.repositories.base import BaseRepository
from src.schemas.customer import CustomerCreate, CustomerUpdate


class CustomerRepository(BaseRepository[Customer]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Customer, session)

    async def get_all(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> list[Customer]:
        query = select(Customer)
        if active_only:
            query = query.where(Customer.is_active == True)
        result = await self.session.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all())

    async def get_by_email(self, email: str) -> Customer | None:
        result = await self.session.execute(
            select(Customer).where(Customer.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone: str) -> Customer | None:
        result = await self.session.execute(
            select(Customer).where(Customer.phone == phone)
        )
        return result.scalar_one_or_none()

    async def create(self, data: CustomerCreate) -> Customer:
        obj = Customer(**data.model_dump())
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, customer: Customer, data: CustomerUpdate) -> Customer:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(customer, key, value)
        await self.session.flush()
        await self.session.refresh(customer)
        return customer

    async def update_loyalty_points(self, customer: Customer, points: int) -> Customer:
        customer.loyalty_points = points
        await self.session.flush()
        await self.session.refresh(customer)
        return customer

    async def soft_delete(self, customer: Customer) -> None:
        customer.is_active = False
        await self.session.flush()
