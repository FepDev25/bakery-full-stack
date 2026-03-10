from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from src.repositories.base import BaseRepository
from src.schemas.user import UserCreate, UserUpdate


class UserRepository(BaseRepository[User]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(User, session)

    async def get_all(self, skip: int = 0, limit: int = 100, active_only: bool = True) -> list[User]:
        query = select(User)
        if active_only:
            query = query.where(User.is_active == True)
        result = await self.session.execute(query.offset(skip).limit(limit))
        return list(result.scalars().all())

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def create(self, data: UserCreate, password_hash: str) -> User:
        # password_hash viene ya procesado por el servicio — nunca llega el password plano aquí
        obj = User(
            email=data.email,
            full_name=data.full_name,
            role=data.role,
            password_hash=password_hash,
        )
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, user: User, data: UserUpdate) -> User:
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(user, key, value)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def update_password(self, user: User, new_password_hash: str) -> None:
        user.password_hash = new_password_hash
        await self.session.flush()

    async def soft_delete(self, user: User) -> None:
        user.is_active = False
        await self.session.flush()
