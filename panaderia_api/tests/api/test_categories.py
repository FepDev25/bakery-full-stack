import uuid
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.category import get_service
from src.models.category import Category


# ── fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


def make_category(**kwargs) -> Category:
    """Construye un objeto Category con valores por defecto."""
    from datetime import datetime, timezone
    defaults = {
        "id": uuid.uuid4(),
        "name": "Panadería",
        "description": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    obj = Category()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    return obj


# ── GET /categories ──────────────────────────────────────────────────────────

def test_list_categories_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_category(), make_category(name="Pastelería")]
    mock_service.count_all.return_value = 2

    response = client.get("/api/v1/categories")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 2
    assert response.json()["total"] == 2


def test_list_categories_empty(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = []
    mock_service.count_all.return_value = 0

    response = client.get("/api/v1/categories")

    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.json()["total"] == 0


# ── GET /categories/{id} ─────────────────────────────────────────────────────

def test_get_category_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    category = make_category(name="Galletas")
    mock_service.get_by_id.return_value = category

    response = client.get(f"/api/v1/categories/{category.id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Galletas"


def test_get_category_not_found(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import NotFoundException
    mock_service.get_by_id.side_effect = NotFoundException("Categoría no encontrada")

    response = client.get(f"/api/v1/categories/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Categoría no encontrada"
    assert response.json()["error"] == "NotFoundException"


# ── POST /categories ─────────────────────────────────────────────────────────

def test_create_category_returns_201(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.create.return_value = make_category(name="Bebidas")

    response = client.post("/api/v1/categories", json={"name": "Bebidas"})

    assert response.status_code == 201
    assert response.json()["name"] == "Bebidas"


def test_create_category_conflict(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import DuplicateEntityError
    mock_service.create.side_effect = DuplicateEntityError("Ya existe una categoría con ese nombre")

    response = client.post("/api/v1/categories", json={"name": "Panadería"})

    assert response.status_code == 409
    assert response.json()["error"] == "DuplicateEntityError"


def test_create_category_invalid_body(client: TestClient, mock_service: AsyncMock) -> None:
    # name es requerido — Pydantic rechaza antes de llegar al servicio
    response = client.post("/api/v1/categories", json={})

    assert response.status_code == 422
    mock_service.create.assert_not_called()


# ── PATCH /categories/{id} ───────────────────────────────────────────────────

def test_update_category_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    category_id = uuid.uuid4()
    mock_service.update.return_value = make_category(id=category_id, name="Panadería Artesanal")

    response = client.patch(f"/api/v1/categories/{category_id}", json={"name": "Panadería Artesanal"})

    assert response.status_code == 200
    assert response.json()["name"] == "Panadería Artesanal"


# ── DELETE /categories/{id} ──────────────────────────────────────────────────

def test_delete_category_returns_204(client: TestClient, mock_service: AsyncMock) -> None:
    category_id = uuid.uuid4()
    mock_service.delete.return_value = None

    response = client.delete(f"/api/v1/categories/{category_id}")

    assert response.status_code == 204


def test_delete_category_not_found(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import NotFoundException
    mock_service.delete.side_effect = NotFoundException("Categoría no encontrada")

    response = client.delete(f"/api/v1/categories/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json()["error"] == "NotFoundException"
