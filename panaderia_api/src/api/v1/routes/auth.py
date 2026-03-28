# controlador de autenticación, con endpoints para login y refresh token

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_async_db
from src.core.dependencies import get_current_user
from src.core.security import create_access_token, create_refresh_token, decode_token
from src.models.user import User
from src.repositories.user import UserRepository
from src.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from src.schemas.user import UserResponse
from src.services.user import UserService

router = APIRouter()

# obtener el servicio de usuario
def get_service(session: Annotated[AsyncSession, Depends(get_async_db)]) -> UserService:
    return UserService(UserRepository(session))

# dependencia para inyectar el servicio de usuario en los endpoints
ServiceDep = Annotated[UserService, Depends(get_service)]

# función auxiliar para construir la respuesta de tokens a partir de la información del usuario
# creando el payload y generando los tokens JWT
def _build_token_response(user_id: str, email: str, role: str) -> TokenResponse:
    payload = {"sub": user_id, "email": email, "role": role}
    return TokenResponse(
        access_token=create_access_token(payload),
        refresh_token=create_refresh_token(payload),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

# endpoint para login, autenticando al usuario y devolviendo los tokens JWT
@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, service: ServiceDep) -> TokenResponse:
    user = await service.authenticate_user(data.email, data.password)
    return _build_token_response(str(user.id), user.email, user.role.value)

# endpoint para refresh token, validando el refresh token y devolviendo nuevos tokens JWT
@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, service: ServiceDep) -> TokenResponse:
    payload = decode_token(data.refresh_token, expected_type="refresh")
    user = await service.get_by_id(UUID(payload["sub"]))
    return _build_token_response(str(user.id), user.email, user.role.value)

# endpoint para obtener el usuario autenticado actual a partir del token JWT
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
    return current_user
