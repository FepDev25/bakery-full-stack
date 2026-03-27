import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.product import get_service
from src.core.dependencies import get_current_user
from src.models.enums import ProductUnit, Role
from src.models.product import Product
from src.models.user import User


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


def make_product(**kwargs) -> Product:
    defaults = {
        "id": uuid.uuid4(),
        "category_id": uuid.uuid4(),
        "name": "Baguette",
        "description": None,
        "price": Decimal("1500.00"),
        "unit": ProductUnit.UNIDAD,
        "stock_quantity": Decimal("0.000"),
        "min_stock_alert": Decimal("0.000"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    obj = Product()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    return obj


VALID_PAYLOAD = {
    "name": "Baguette",
    "price": "1500.00",
    "unit": "unidad",
    "category_id": str(uuid.uuid4()),
}


# ── GET /products ─────────────────────────────────────────────────────────────

def test_list_products_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_product(), make_product(name="Croissant")]
    mock_service.count_all.return_value = 2

    response = client.get("/api/v1/products")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 2
    assert response.json()["total"] == 2


def test_list_products_paginated_structure(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_product()]
    mock_service.count_all.return_value = 25

    response = client.get("/api/v1/products?page=2&page_size=10")

    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 2
    assert body["page_size"] == 10
    assert body["total"] == 25
    assert body["total_pages"] == 3


def test_list_products_search_filter(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_product(name="Baguette")]
    mock_service.count_all.return_value = 1

    response = client.get("/api/v1/products?search=bag")

    assert response.status_code == 200
    mock_service.get_all.assert_called_once()
    call_kwargs = mock_service.get_all.call_args[1]
    assert call_kwargs["search"] == "bag"


def test_get_product_ok(client: TestClient, mock_service: AsyncMock) -> None:
    product = make_product(name="Medialunas")
    mock_service.get_by_id.return_value = product

    response = client.get(f"/api/v1/products/{product.id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Medialunas"


def test_get_product_not_found(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import NotFoundException
    mock_service.get_by_id.side_effect = NotFoundException("Producto no encontrado")

    response = client.get(f"/api/v1/products/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json()["error"] == "NotFoundException"


# ── POST /products ────────────────────────────────────────────────────────────

def test_create_product_ok(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.create.return_value = make_product()

    response = client.post("/api/v1/products", json=VALID_PAYLOAD)

    assert response.status_code == 201


def test_create_product_forbidden_for_cajero(client: TestClient, mock_service: AsyncMock) -> None:
    cajero = User()
    cajero.id = uuid.uuid4()
    cajero.role = Role.CAJERO
    cajero.is_active = True
    app.dependency_overrides[get_current_user] = lambda: cajero

    response = client.post("/api/v1/products", json=VALID_PAYLOAD)

    assert response.status_code == 403
    assert response.json()["error"] == "ForbiddenError"

    from tests.conftest import make_admin_user
    app.dependency_overrides[get_current_user] = lambda: make_admin_user()


def test_create_product_duplicate(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import DuplicateEntityError
    mock_service.create.side_effect = DuplicateEntityError("Ya existe un producto con ese nombre en la categoría")

    response = client.post("/api/v1/products", json=VALID_PAYLOAD)

    assert response.status_code == 409


def test_create_product_invalid_body(client: TestClient, mock_service: AsyncMock) -> None:
    response = client.post("/api/v1/products", json={"name": "Sin precio"})

    assert response.status_code == 422
    mock_service.create.assert_not_called()


# ── DELETE /products/{id} — RN-005 ───────────────────────────────────────────

def test_delete_product_ok(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.delete.return_value = None

    response = client.delete(f"/api/v1/products/{uuid.uuid4()}")

    assert response.status_code == 204


def test_delete_product_with_stock_returns_409(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import DeleteConstraintError
    mock_service.delete.side_effect = DeleteConstraintError(
        "No se puede desactivar: tiene stock disponible"
    )

    response = client.delete(f"/api/v1/products/{uuid.uuid4()}")

    assert response.status_code == 409
    assert response.json()["error"] == "DeleteConstraintError"


# ── PATCH /products/{id} ─────────────────────────────────────────────────────

def test_update_product_ok(client: TestClient, mock_service: AsyncMock) -> None:
    product_id = uuid.uuid4()
    mock_service.update.return_value = make_product(id=product_id, price=Decimal("2000.00"))

    response = client.patch(f"/api/v1/products/{product_id}", json={"price": "2000.00"})

    assert response.status_code == 200
