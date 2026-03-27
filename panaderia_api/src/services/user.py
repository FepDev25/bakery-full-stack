from datetime import datetime, timezone
from uuid import UUID

from src.core.exceptions import DuplicateEntityError, NotFoundException, UnauthorizedError
from src.core.security import hash_password, verify_password
from src.models.user import User
from src.repositories.user import UserRepository
from src.schemas.user import UserChangePassword, UserCreate, UserUpdate

# servicio de negocio para manejo de usuarios
class UserService:
    def __init__(self, repo: UserRepository) -> None:
        self.repo = repo

    # método para crear un nuevo usuario
    async def create_user(self, data: UserCreate) -> User:
        # verificar que no existe otro usuario con el mismo correo electrónico
        if await self.repo.get_by_email(data.email):
            raise DuplicateEntityError("Ya existe un usuario con ese correo electrónico")
        
        user = await self.repo.create(data, password_hash=hash_password(data.password))
        await self.repo.session.commit()
        return user

    # método para autenticar un usuario con correo electrónico y contraseña
    async def authenticate_user(self, email: str, password: str) -> User:
        # obtener el usuario por correo electrónico
        user = await self.repo.get_by_email(email)
        # verificar credenciales y estado del usuario
        if not user or not user.is_active:
            raise UnauthorizedError("Credenciales inválidas")
        
        if not verify_password(password, user.password_hash):
            raise UnauthorizedError("Credenciales inválidas")
        
        user.last_login = datetime.now(timezone.utc)
        await self.repo.session.commit()
        return user

    # método para obtener un usuario por su ID, con manejo de error si no existe
    async def get_by_id(self, id: UUID) -> User:
        user = await self.repo.get_by_id(id)
        
        if not user:
            raise NotFoundException("Usuario no encontrado")
        
        return user

    # método para obtener una lista de usuarios con paginación
    async def get_all(self, skip: int = 0, limit: int = 100) -> list[User]:
        return await self.repo.get_all(skip=skip, limit=limit)

    # método para actualizar un usuario
    async def update(self, id: UUID, data: UserUpdate) -> User:
        user = await self.get_by_id(id)
        
        # si se intenta cambiar el correo electrónico, verificar que no existe otro usuario con ese correo electrónico
        if data.email and data.email != user.email:
            if await self.repo.get_by_email(data.email):
                raise DuplicateEntityError("Ya existe un usuario con ese correo electrónico")
        
        updated = await self.repo.update(user, data)
        await self.repo.session.commit()
        return updated

    # método para eliminar un usuario (soft delete)
    async def delete(self, id: UUID) -> None:
        user = await self.get_by_id(id)
        await self.repo.soft_delete(user)
        await self.repo.session.commit()

    # método para cambiar la contraseña de un usuario, verificando la contraseña actual
    async def change_password(self, id: UUID, data: UserChangePassword) -> None:
        user = await self.get_by_id(id)
            
        if not verify_password(data.current_password, user.password_hash):
            raise UnauthorizedError("La contraseña actual es incorrecta")
        
        await self.repo.update_password(user, hash_password(data.new_password))
        await self.repo.session.commit()
