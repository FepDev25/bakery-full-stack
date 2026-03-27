# modulo de seguridad para manejo de contraseñas y tokens JWT

from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from src.core.config import settings
from src.core.exceptions import UnauthorizedError

# hashing de contraseñas usando bcrypt con un costo de 12
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=12)).decode()

# verificación de contraseñas usando bcrypt
def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

# creación de tokens JWT para acceso y refresh, con expiración y tipo en el payload
def create_access_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    data["type"] = "access"
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(payload: dict) -> str:
    data = payload.copy()
    data["exp"] = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    data["type"] = "refresh"
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

# decodificación de tokens JWT con verificación de tipo y manejo de errores
def decode_token(token: str, expected_type: str = "access") -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise UnauthorizedError("Token inválido o expirado")

    if payload.get("type") != expected_type:
        raise UnauthorizedError("Tipo de token incorrecto")

    return payload
