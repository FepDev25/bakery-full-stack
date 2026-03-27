import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.production_batch import get_service
from src.models.enums import ProductionBatchStatus
from src.models.production_batch import ProductionBatch


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


def make_batch(**kwargs) -> ProductionBatch:
    defaults = {
        "id": uuid.uuid4(),
        "product_id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "quantity_produced": Decimal("10.000"),
        "unit": "unidad",
        "production_date": date.today(),
        "notes": None,
        "ingredient_cost": Decimal("0.00"),
        "status": ProductionBatchStatus.EN_PROCESO,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    obj = ProductionBatch()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    return obj


VALID_PAYLOAD = {
    "product_id": str(uuid.uuid4()),
    "quantity_produced": "10.000",
    "unit": "unidad",
    "production_date": str(date.today()),
}


# ── GET /production-batches ───────────────────────────────────────────────────

def test_list_batches_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_batch(), make_batch()]
    mock_service.count_all.return_value = 2

    response = client.get("/api/v1/production-batches")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 2


def test_get_batch_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    batch = make_batch()
    mock_service.get_by_id.return_value = batch

    response = client.get(f"/api/v1/production-batches/{batch.id}")

    assert response.status_code == 200
    assert response.json()["status"] == "en_proceso"


def test_get_batch_not_found(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import NotFoundException
    mock_service.get_by_id.side_effect = NotFoundException("Lote no encontrado")

    response = client.get(f"/api/v1/production-batches/{uuid.uuid4()}")

    assert response.status_code == 404


# ── POST /production-batches ──────────────────────────────────────────────────

def test_create_batch_returns_201(client: TestClient, mock_service: AsyncMock) -> None:
    batch = make_batch()
    mock_service.create_batch.return_value = batch

    response = client.post("/api/v1/production-batches", json=VALID_PAYLOAD)

    assert response.status_code == 201
    assert response.json()["status"] == "en_proceso"
    mock_service.create_batch.assert_called_once()


def test_create_batch_product_not_found_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException
    mock_service.create_batch.side_effect = NotFoundException("Producto no encontrado o inactivo")

    response = client.post("/api/v1/production-batches", json=VALID_PAYLOAD)

    assert response.status_code == 404


def test_create_batch_no_recipe_returns_400(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import ValidationError
    mock_service.create_batch.side_effect = ValidationError(
        "El producto 'Baguette' no tiene receta definida."
    )

    response = client.post("/api/v1/production-batches", json=VALID_PAYLOAD)

    assert response.status_code == 400
    assert response.json()["error"] == "ValidationError"


def test_create_batch_invalid_quantity_returns_422(client: TestClient, mock_service: AsyncMock) -> None:
    payload = {**VALID_PAYLOAD, "quantity_produced": "-1.000"}

    response = client.post("/api/v1/production-batches", json=payload)

    assert response.status_code == 422
    mock_service.create_batch.assert_not_called()


# ── POST /production-batches/{id}/complete ────────────────────────────────────

def test_complete_batch_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    completed = make_batch(
        status=ProductionBatchStatus.COMPLETADO,
        ingredient_cost=Decimal("150.00"),
    )
    mock_service.complete_batch.return_value = completed

    response = client.post(f"/api/v1/production-batches/{completed.id}/complete")

    assert response.status_code == 200
    assert response.json()["status"] == "completado"
    assert response.json()["ingredient_cost"] == "150.00"


def test_complete_batch_insufficient_stock_returns_400(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import InsufficientStockError
    mock_service.complete_batch.side_effect = InsufficientStockError(
        "Ingredientes insuficientes: 'Harina': disponible 1.000, requerido 5.000"
    )

    response = client.post(f"/api/v1/production-batches/{uuid.uuid4()}/complete")

    assert response.status_code == 400
    assert response.json()["error"] == "InsufficientStockError"


def test_complete_already_completed_returns_400(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import ValidationError
    mock_service.complete_batch.side_effect = ValidationError(
        "No se puede completar un lote con estado 'completado'"
    )

    response = client.post(f"/api/v1/production-batches/{uuid.uuid4()}/complete")

    assert response.status_code == 400


# ── POST /production-batches/{id}/discard ─────────────────────────────────────

def test_discard_batch_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    discarded = make_batch(
        status=ProductionBatchStatus.DESCARTADO,
        ingredient_cost=Decimal("75.00"),
    )
    mock_service.discard_batch.return_value = discarded

    response = client.post(f"/api/v1/production-batches/{discarded.id}/discard")

    assert response.status_code == 200
    assert response.json()["status"] == "descartado"


def test_discard_batch_insufficient_stock_returns_400(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import InsufficientStockError
    mock_service.discard_batch.side_effect = InsufficientStockError(
        "Ingredientes insuficientes"
    )

    response = client.post(f"/api/v1/production-batches/{uuid.uuid4()}/discard")

    assert response.status_code == 400


# ── RBAC ──────────────────────────────────────────────────────────────────────

def test_cajero_cannot_create_batch(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.dependencies import get_current_user
    from src.models.enums import Role
    from src.models.user import User
    from tests.conftest import make_admin_user

    cajero = User()
    cajero.id = uuid.uuid4()
    cajero.role = Role.CAJERO
    cajero.is_active = True
    app.dependency_overrides[get_current_user] = lambda: cajero

    response = client.post("/api/v1/production-batches", json=VALID_PAYLOAD)

    assert response.status_code == 403

    app.dependency_overrides[get_current_user] = lambda: make_admin_user()
