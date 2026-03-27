# dependencias para manejo de autenticación y autorización en FastAPI

from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_async_db
from src.core.exceptions import ForbiddenError, UnauthorizedError
from src.core.security import decode_token
from src.models.enums import Role
from src.models.user import User
from src.repositories.user import UserRepository

# dependencia para obtener el usuario actual a partir del token JWT en la cabecera Authorization
_bearer_scheme = HTTPBearer()

# función para obtener el usuario actual a partir del token JWT, con verificación de validez y estado
async def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_async_db)]) -> User:

    # decodificar el token y verificar su tipo y expiración
    payload = decode_token(credentials.credentials, expected_type="access")

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token sin identidad")

    # obtener el usuario de la base de datos y verificar que sigue activo
    repo = UserRepository(db)
    user = await repo.get_by_id(UUID(user_id))

    # verificar que el usuario existe y está activo
    if not user or not user.is_active:
        raise UnauthorizedError("Usuario no encontrado o inactivo")

    return user

# factoría de dependencias para requerir un rol específico en las rutas, verificando el rol del usuario actual
def require_role(*roles: Role):
    async def checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in roles:
            raise ForbiddenError("No tiene permisos para realizar esta acción")
        return current_user

    return checker
