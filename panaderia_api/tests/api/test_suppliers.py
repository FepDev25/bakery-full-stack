import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.supplier import get_service
from src.models.supplier import Supplier


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


def make_supplier(**kwargs) -> Supplier:
    defaults = {
        "id": uuid.uuid4(),
        "name": "Harinas del Sur",
        "contact_person": None,
        "phone": "099111222",
        "email": None,
        "address": None,
        "tax_id": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    obj = Supplier()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    return obj


VALID_PAYLOAD = {"name": "Harinas del Sur", "phone": "099111222"}


def test_list_suppliers(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_supplier(), make_supplier(name="Lácteos SA")]
    mock_service.count_all.return_value = 2

    response = client.get("/api/v1/suppliers")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 2
    assert response.json()["total"] == 2


def test_get_supplier_ok(client: TestClient, mock_service: AsyncMock) -> None:
    supplier = make_supplier()
    mock_service.get_by_id.return_value = supplier

    response = client.get(f"/api/v1/suppliers/{supplier.id}")

    assert response.status_code == 200
    assert response.json()["name"] == supplier.name


def test_create_supplier_ok(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.create.return_value = make_supplier()

    response = client.post("/api/v1/suppliers", json=VALID_PAYLOAD)

    assert response.status_code == 201


def test_create_supplier_requires_contact(client: TestClient, mock_service: AsyncMock) -> None:
    # Sin phone ni email — @model_validator rechaza antes de llegar al servicio
    response = client.post("/api/v1/suppliers", json={"name": "Sin contacto"})

    assert response.status_code == 422
    mock_service.create.assert_not_called()


def test_create_supplier_name_conflict(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import DuplicateEntityError
    mock_service.create.side_effect = DuplicateEntityError("Ya existe un proveedor con ese nombre")

    response = client.post("/api/v1/suppliers", json=VALID_PAYLOAD)

    assert response.status_code == 409
    assert response.json()["error"] == "DuplicateEntityError"


def test_update_supplier_ok(client: TestClient, mock_service: AsyncMock) -> None:
    supplier_id = uuid.uuid4()
    mock_service.update.return_value = make_supplier(id=supplier_id, phone="099999999")

    response = client.patch(f"/api/v1/suppliers/{supplier_id}", json={"phone": "099999999"})

    assert response.status_code == 200
    assert response.json()["phone"] == "099999999"


def test_delete_supplier_ok(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.delete.return_value = None

    response = client.delete(f"/api/v1/suppliers/{uuid.uuid4()}")

    assert response.status_code == 204
