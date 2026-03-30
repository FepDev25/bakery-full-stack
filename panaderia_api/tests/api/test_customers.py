import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.customer import get_service
from src.core.dependencies import get_current_user
from src.models.customer import Customer
from src.models.enums import Role
from src.models.user import User
from src.schemas.customer import RedeemPointsResponse


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


def make_customer(**kwargs) -> Customer:
    defaults = {
        "id": uuid.uuid4(),
        "name": "Juan Pérez",
        "phone": "099111222",
        "email": None,
        "address": None,
        "loyalty_points": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    obj = Customer()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    return obj


VALID_PAYLOAD = {"name": "Juan Pérez", "phone": "099111222"}


# ── GET /customers ────────────────────────────────────────────────────────────


def test_list_customers_returns_200(
    client: TestClient, mock_service: AsyncMock
) -> None:
    mock_service.get_all.return_value = [
        make_customer(),
        make_customer(name="Ana García"),
    ]
    mock_service.count_all.return_value = 2

    response = client.get("/api/v1/customers")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 2
    assert response.json()["total"] == 2


def test_get_customer_ok(client: TestClient, mock_service: AsyncMock) -> None:
    customer = make_customer(name="Ana García")
    mock_service.get_by_id.return_value = customer

    response = client.get(f"/api/v1/customers/{customer.id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Ana García"


def test_get_customer_not_found(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import NotFoundException

    mock_service.get_by_id.side_effect = NotFoundException("Cliente no encontrado")

    response = client.get(f"/api/v1/customers/{uuid.uuid4()}")

    assert response.status_code == 404


# ── POST /customers ───────────────────────────────────────────────────────────


def test_create_customer_ok(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.create.return_value = make_customer()

    response = client.post("/api/v1/customers", json=VALID_PAYLOAD)

    assert response.status_code == 201


def test_create_customer_requires_contact(
    client: TestClient, mock_service: AsyncMock
) -> None:
    response = client.post("/api/v1/customers", json={"name": "Sin contacto"})

    assert response.status_code == 422
    mock_service.create.assert_not_called()


def test_create_customer_duplicate_phone(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import DuplicateEntityError

    mock_service.create.side_effect = DuplicateEntityError(
        "Ya existe un cliente con ese teléfono"
    )

    response = client.post("/api/v1/customers", json=VALID_PAYLOAD)

    assert response.status_code == 409
    assert response.json()["error"] == "DuplicateEntityError"


# ── POST /customers/{id}/redeem-points — RN-009 ───────────────────────────────


def test_redeem_points_ok(client: TestClient, mock_service: AsyncMock) -> None:
    customer_id = uuid.uuid4()
    mock_service.redeem_points.return_value = RedeemPointsResponse(
        discount_amount=Decimal("10.00"),
        remaining_points=0,
    )

    response = client.post(
        f"/api/v1/customers/{customer_id}/redeem-points",
        json={"points": 100},
    )

    assert response.status_code == 200
    assert response.json()["discount_amount"] == 10.0
    assert response.json()["remaining_points"] == 0


def test_redeem_points_insufficient(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import ValidationError

    mock_service.redeem_points.side_effect = ValidationError(
        "Puntos insuficientes: el cliente tiene 50, se intentan canjear 100"
    )

    response = client.post(
        f"/api/v1/customers/{uuid.uuid4()}/redeem-points",
        json={"points": 100},
    )

    assert response.status_code == 400
    assert response.json()["error"] == "ValidationError"


def test_redeem_points_invalid_zero(
    client: TestClient, mock_service: AsyncMock
) -> None:
    # points debe ser > 0 — Pydantic rechaza
    response = client.post(
        f"/api/v1/customers/{uuid.uuid4()}/redeem-points",
        json={"points": 0},
    )

    assert response.status_code == 422
    mock_service.redeem_points.assert_not_called()


# ── DELETE /customers ─────────────────────────────────────────────────────────


def test_delete_customer_requires_admin(
    client: TestClient, mock_service: AsyncMock
) -> None:
    cajero = User()
    cajero.id = uuid.uuid4()
    cajero.role = Role.CAJERO
    cajero.is_active = True
    app.dependency_overrides[get_current_user] = lambda: cajero

    response = client.delete(f"/api/v1/customers/{uuid.uuid4()}")

    assert response.status_code == 403

    from tests.conftest import make_admin_user

    app.dependency_overrides[get_current_user] = lambda: make_admin_user()


def test_delete_customer_ok(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.delete.return_value = None

    response = client.delete(f"/api/v1/customers/{uuid.uuid4()}")

    assert response.status_code == 204
