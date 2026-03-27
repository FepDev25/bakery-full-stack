import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.sale import get_service
from src.models.enums import PaymentMethod, SaleStatus
from src.models.sale import Sale
from src.models.sale_item import SaleItem


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


def make_sale_item(**kwargs) -> SaleItem:
    defaults = {
        "id": uuid.uuid4(),
        "sale_id": uuid.uuid4(),
        "product_id": uuid.uuid4(),
        "quantity": Decimal("2.000"),
        "unit": "unidad",
        "unit_price": Decimal("1500.00"),
        "subtotal": Decimal("3000.00"),
        "created_at": datetime.now(timezone.utc),
    }
    obj = SaleItem()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    return obj


def make_sale(**kwargs) -> Sale:
    sale_id = kwargs.pop("id", uuid.uuid4())
    defaults = {
        "id": sale_id,
        "customer_id": None,
        "user_id": uuid.uuid4(),
        "sale_number": "VTA-2026-00001",
        "subtotal": Decimal("3000.00"),
        "discount_amount": Decimal("0.00"),
        "tax_amount": Decimal("0.00"),
        "total_amount": Decimal("3000.00"),
        "payment_method": PaymentMethod.EFECTIVO,
        "status": SaleStatus.COMPLETADA,
        "sale_date": datetime.now(timezone.utc),
        "notes": None,
        "created_at": datetime.now(timezone.utc),
    }
    obj = Sale()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    # items como lista vacía por defecto
    obj.items = kwargs.get("items", [make_sale_item(sale_id=obj.id)])
    return obj


VALID_PAYLOAD = {
    "payment_method": "efectivo",
    "items": [
        {"product_id": str(uuid.uuid4()), "quantity": "2.000"},
    ],
}


# ── GET /sales ────────────────────────────────────────────────────────────────

def test_list_sales_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_sale(), make_sale(sale_number="VTA-2026-00002")]
    mock_service.count_all.return_value = 2

    response = client.get("/api/v1/sales")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 2
    assert response.json()["total"] == 2


def test_list_sales_with_date_range(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_sale()]
    mock_service.count_all.return_value = 1

    response = client.get("/api/v1/sales?from_date=2026-01-01&to_date=2026-01-31")

    assert response.status_code == 200
    call_kwargs = mock_service.get_all.call_args[1]
    from datetime import date
    assert call_kwargs["from_date"] == date(2026, 1, 1)
    assert call_kwargs["to_date"] == date(2026, 1, 31)


def test_get_sale_returns_200_with_items(client: TestClient, mock_service: AsyncMock) -> None:
    sale = make_sale()
    mock_service.get_by_id.return_value = sale

    response = client.get(f"/api/v1/sales/{sale.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["sale_number"] == "VTA-2026-00001"
    assert len(body["items"]) == 1


def test_get_sale_not_found(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import NotFoundException
    mock_service.get_by_id.side_effect = NotFoundException("Venta no encontrada")

    response = client.get(f"/api/v1/sales/{uuid.uuid4()}")

    assert response.status_code == 404


# ── POST /sales ───────────────────────────────────────────────────────────────

def test_create_sale_returns_201(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.create_sale.return_value = make_sale()

    response = client.post("/api/v1/sales", json=VALID_PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["sale_number"] == "VTA-2026-00001"
    assert body["status"] == "completada"
    assert len(body["items"]) == 1


def test_create_sale_insufficient_stock_returns_400(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import InsufficientStockError
    mock_service.create_sale.side_effect = InsufficientStockError(
        "Stock insuficiente para 'Baguette': disponible 1.000, requerido 2.000"
    )

    response = client.post("/api/v1/sales", json=VALID_PAYLOAD)

    assert response.status_code == 400
    assert response.json()["error"] == "InsufficientStockError"


def test_create_sale_empty_items_returns_422(client: TestClient, mock_service: AsyncMock) -> None:
    response = client.post(
        "/api/v1/sales",
        json={"payment_method": "efectivo", "items": []},
    )

    assert response.status_code == 422
    mock_service.create_sale.assert_not_called()


def test_create_sale_missing_items_returns_422(client: TestClient, mock_service: AsyncMock) -> None:
    response = client.post("/api/v1/sales", json={"payment_method": "efectivo"})

    assert response.status_code == 422
    mock_service.create_sale.assert_not_called()


def test_create_sale_invalid_payment_method_returns_422(
    client: TestClient, mock_service: AsyncMock
) -> None:
    payload = {**VALID_PAYLOAD, "payment_method": "bitcoin"}
    response = client.post("/api/v1/sales", json=payload)

    assert response.status_code == 422
    mock_service.create_sale.assert_not_called()


# ── POST /sales/{id}/cancel ───────────────────────────────────────────────────

def test_cancel_sale_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    cancelled = make_sale(status=SaleStatus.CANCELADA)
    mock_service.cancel_sale.return_value = cancelled

    response = client.post(f"/api/v1/sales/{cancelled.id}/cancel", json={})

    assert response.status_code == 200
    assert response.json()["status"] == "cancelada"


def test_cancel_sale_day_before_returns_400(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import ValidationError
    mock_service.cancel_sale.side_effect = ValidationError(
        "Solo se puede cancelar una venta el mismo día de su registro"
    )

    response = client.post(f"/api/v1/sales/{uuid.uuid4()}/cancel", json={})

    assert response.status_code == 400
    assert response.json()["error"] == "ValidationError"


def test_cancel_already_cancelled_returns_400(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import ValidationError
    mock_service.cancel_sale.side_effect = ValidationError("La venta ya está cancelada")

    response = client.post(f"/api/v1/sales/{uuid.uuid4()}/cancel", json={})

    assert response.status_code == 400


# ── RBAC ──────────────────────────────────────────────────────────────────────

def test_panadero_cannot_create_sale(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.dependencies import get_current_user
    from src.models.enums import Role
    from src.models.user import User
    from tests.conftest import make_admin_user

    panadero = User()
    panadero.id = uuid.uuid4()
    panadero.role = Role.PANADERO
    panadero.is_active = True
    app.dependency_overrides[get_current_user] = lambda: panadero

    response = client.post("/api/v1/sales", json=VALID_PAYLOAD)

    assert response.status_code == 403

    app.dependency_overrides[get_current_user] = lambda: make_admin_user()
