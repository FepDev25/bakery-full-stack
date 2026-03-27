import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.user import get_service
from src.core.dependencies import get_current_user
from src.models.enums import Role
from src.models.user import User


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


def make_user(**kwargs) -> User:
    defaults = {
        "id": uuid.uuid4(),
        "email": "cajero@test.com",
        "full_name": "María Cajero",
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


VALID_PAYLOAD = {
    "email": "nuevo@test.com",
    "full_name": "Nuevo Usuario",
    "role": "cajero",
    "password": "password123",
}


# ── GET /users ────────────────────────────────────────────────────────────────

def test_list_users_ok(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_user(), make_user(email="admin@test.com", role=Role.ADMIN)]

    response = client.get("/api/v1/users")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_list_users_forbidden_for_cajero(client: TestClient, mock_service: AsyncMock) -> None:
    cajero = make_user()
    app.dependency_overrides[get_current_user] = lambda: cajero

    response = client.get("/api/v1/users")

    assert response.status_code == 403

    from tests.conftest import make_admin_user
    app.dependency_overrides[get_current_user] = lambda: make_admin_user()


# ── POST /users ───────────────────────────────────────────────────────────────

def test_create_user_ok(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.create_user.return_value = make_user(email="nuevo@test.com")

    response = client.post("/api/v1/users", json=VALID_PAYLOAD)

    assert response.status_code == 201


def test_create_user_duplicate_email(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import DuplicateEntityError
    mock_service.create_user.side_effect = DuplicateEntityError("Ya existe un usuario con ese correo")

    response = client.post("/api/v1/users", json=VALID_PAYLOAD)

    assert response.status_code == 409


def test_create_user_invalid_body(client: TestClient, mock_service: AsyncMock) -> None:
    response = client.post("/api/v1/users", json={"email": "solo@email.com"})

    assert response.status_code == 422
    mock_service.create_user.assert_not_called()


# ── PATCH /users/{id} ────────────────────────────────────────────────────────

def test_update_user_ok(client: TestClient, mock_service: AsyncMock) -> None:
    user_id = uuid.uuid4()
    mock_service.update.return_value = make_user(id=user_id, role=Role.CONTADOR)

    response = client.patch(f"/api/v1/users/{user_id}", json={"role": "contador"})

    assert response.status_code == 200
    assert response.json()["role"] == "contador"


# ── DELETE /users/{id} ───────────────────────────────────────────────────────

def test_delete_user_ok(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.delete.return_value = None

    response = client.delete(f"/api/v1/users/{uuid.uuid4()}")

    assert response.status_code == 204


# ── PATCH /users/{id}/password ────────────────────────────────────────────────

def test_change_own_password_ok(client: TestClient, mock_service: AsyncMock) -> None:
    # El usuario del bypass (admin) cambia su propia contraseña
    from tests.conftest import make_admin_user
    admin = make_admin_user()
    app.dependency_overrides[get_current_user] = lambda: admin
    mock_service.change_password.return_value = None

    response = client.patch(
        f"/api/v1/users/{admin.id}/password",
        json={"current_password": "old_pass", "new_password": "new_pass123"},
    )

    assert response.status_code == 204


def test_change_other_user_password_forbidden_for_non_admin(
    client: TestClient, mock_service: AsyncMock
) -> None:
    cajero = make_user()
    app.dependency_overrides[get_current_user] = lambda: cajero

    other_user_id = uuid.uuid4()
    response = client.patch(
        f"/api/v1/users/{other_user_id}/password",
        json={"current_password": "old", "new_password": "new_pass123"},
    )

    assert response.status_code == 403

    from tests.conftest import make_admin_user
    app.dependency_overrides[get_current_user] = lambda: make_admin_user()
