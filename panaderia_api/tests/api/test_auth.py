import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.auth import get_service
from src.core.dependencies import get_current_user
from src.core.exceptions import UnauthorizedError
from src.models.enums import Role
from src.models.user import User


def make_user(**kwargs) -> User:
    defaults = {
        "id": uuid.uuid4(),
        "email": "cajero@test.com",
        "full_name": "Juan Cajero",
        "role": Role.CAJERO,
        "password_hash": "$2b$12$fakehash",
        "is_active": True,
        "last_login": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    obj = User()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    return obj


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


# ── POST /auth/login ──────────────────────────────────────────────────────────

def test_login_returns_tokens(client: TestClient, mock_service: AsyncMock) -> None:
    user = make_user()
    mock_service.authenticate_user.return_value = user

    response = client.post("/api/v1/auth/login", json={"email": user.email, "password": "secret123"})

    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0


def test_login_invalid_credentials(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.authenticate_user.side_effect = UnauthorizedError("Credenciales inválidas")

    response = client.post("/api/v1/auth/login", json={"email": "x@x.com", "password": "wrong"})

    assert response.status_code == 401
    assert response.json()["error"] == "UnauthorizedError"


def test_login_invalid_body(client: TestClient, mock_service: AsyncMock) -> None:
    # Sin email — Pydantic rechaza antes de llegar al servicio
    response = client.post("/api/v1/auth/login", json={"password": "secret"})

    assert response.status_code == 422
    mock_service.authenticate_user.assert_not_called()


# ── POST /auth/refresh ────────────────────────────────────────────────────────

def test_refresh_returns_new_access_token(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.security import create_refresh_token
    user = make_user()
    mock_service.get_by_id.return_value = user

    refresh = create_refresh_token({"sub": str(user.id), "email": user.email, "role": user.role.value})
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_refresh_invalid_token(client: TestClient, mock_service: AsyncMock) -> None:
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": "not.a.token"})

    assert response.status_code == 401


def test_refresh_with_access_token_fails(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.security import create_access_token
    user = make_user()
    access = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role.value})

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": access})

    assert response.status_code == 401


# ── Guards de autenticación en rutas protegidas ───────────────────────────────

def test_protected_route_returns_401_without_token(client: TestClient) -> None:
    # Remover el bypass de auth para este test específico
    app.dependency_overrides.pop(get_current_user, None)

    response = client.get("/api/v1/categories")

    assert response.status_code == 401
    # Restaurar bypass para que no afecte otros tests
    from tests.conftest import make_admin_user
    app.dependency_overrides[get_current_user] = lambda: make_admin_user()


def test_protected_route_returns_401_with_invalid_token(client: TestClient) -> None:
    app.dependency_overrides.pop(get_current_user, None)

    response = client.get("/api/v1/categories", headers={"Authorization": "Bearer invalid.token"})

    assert response.status_code == 401
    from tests.conftest import make_admin_user
    app.dependency_overrides[get_current_user] = lambda: make_admin_user()


# ── require_role ──────────────────────────────────────────────────────────────

def test_require_role_blocks_wrong_role() -> None:
    from src.core.dependencies import require_role
    from src.core.exceptions import ForbiddenError

    cajero = make_user(role=Role.CAJERO)

    import asyncio
    checker = require_role(Role.ADMIN)

    async def run():
        return await checker(cajero)

    with pytest.raises(ForbiddenError, match="No tiene permisos"):
        asyncio.run(run())


def test_require_role_allows_correct_role() -> None:
    from src.core.dependencies import require_role

    admin = make_user(role=Role.ADMIN)

    import asyncio
    checker = require_role(Role.ADMIN, Role.CAJERO)

    async def run():
        return await checker(admin)

    result = asyncio.run(run())
    assert result.role == Role.ADMIN
