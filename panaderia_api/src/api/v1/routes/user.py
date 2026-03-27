from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.core.dependencies import get_current_user, require_role
from src.models.enums import Role
from src.models.user import User
from src.repositories.user import UserRepository
from src.schemas.user import UserChangePassword, UserCreate, UserResponse, UserUpdate
from src.services.user import UserService

# controller de usuarios
router = APIRouter()

# inyección de dependencias para el servicio de usuarios
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> UserService:
    return UserService(UserRepository(session))
ServiceDep = Annotated[UserService, Depends(get_service)]
AdminUser = Annotated[User, Depends(require_role(Role.ADMIN))] # Solo los admins pueden acceder a estas rutas
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("", response_model=list[UserResponse])
async def list_users(service: ServiceDep, _: AdminUser, skip: int = 0, limit: int = 100) -> list[UserResponse]:
    return await service.get_all(skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: UUID, service: ServiceDep, _: AdminUser) -> UserResponse:
    return await service.get_by_id(user_id)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(data: UserCreate, service: ServiceDep, _: AdminUser) -> UserResponse:
    return await service.create_user(data)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: UUID, data: UserUpdate, service: ServiceDep, _: AdminUser) -> UserResponse:
    return await service.update(user_id, data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: UUID, service: ServiceDep, _: AdminUser) -> None:
    await service.delete(user_id)


@router.patch("/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    user_id: UUID,
    data: UserChangePassword,
    service: ServiceDep,
    current_user: CurrentUser,
) -> None:
    # Admin puede cambiar cualquier contraseña, un usuario solo la suya propia
    if current_user.role != Role.ADMIN and current_user.id != user_id:
        from src.core.exceptions import ForbiddenError
        raise ForbiddenError("Solo puede cambiar su propia contraseña")
    await service.change_password(user_id, data)
