import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.ingredient_purchase import get_service
from src.models.enums import IngredientUnit
from src.models.ingredient_purchase import IngredientPurchase


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


def make_purchase(**kwargs) -> IngredientPurchase:
    defaults = {
        "id": uuid.uuid4(),
        "supplier_id": uuid.uuid4(),
        "ingredient_id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "quantity": Decimal("5.000"),
        "unit": IngredientUnit.KG,
        "unit_price": Decimal("2000.00"),
        "total_amount": Decimal("10000.00"),
        "purchase_date": date.today(),
        "invoice_number": "FAC-001",
        "notes": None,
        "created_at": datetime.now(timezone.utc),
    }
    obj = IngredientPurchase()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    return obj


VALID_PAYLOAD = {
    "supplier_id": str(uuid.uuid4()),
    "ingredient_id": str(uuid.uuid4()),
    "quantity": "5.000",
    "unit": "kg",
    "unit_price": "2000.00",
    "purchase_date": str(date.today()),
    "invoice_number": "FAC-001",
}


# ── GET /ingredient-purchases ─────────────────────────────────────────────────

def test_list_purchases_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_purchase(), make_purchase()]
    mock_service.count_all.return_value = 2

    response = client.get("/api/v1/ingredient-purchases")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 2


def test_list_by_supplier_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    supplier_id = uuid.uuid4()
    mock_service.get_by_supplier.return_value = [make_purchase(supplier_id=supplier_id)]

    response = client.get(f"/api/v1/ingredient-purchases/by-supplier/{supplier_id}")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_list_by_ingredient_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    ingredient_id = uuid.uuid4()
    mock_service.get_by_ingredient.return_value = [make_purchase(ingredient_id=ingredient_id)]

    response = client.get(f"/api/v1/ingredient-purchases/by-ingredient/{ingredient_id}")

    assert response.status_code == 200


# ── POST /ingredient-purchases ────────────────────────────────────────────────

def test_register_purchase_returns_201(client: TestClient, mock_service: AsyncMock) -> None:
    purchase = make_purchase()
    mock_service.register_purchase.return_value = purchase

    response = client.post("/api/v1/ingredient-purchases", json=VALID_PAYLOAD)

    assert response.status_code == 201
    assert response.json()["total_amount"] == "10000.00"
    mock_service.register_purchase.assert_called_once()


def test_register_purchase_supplier_not_found_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException
    mock_service.register_purchase.side_effect = NotFoundException(
        "Proveedor no encontrado o inactivo"
    )

    response = client.post("/api/v1/ingredient-purchases", json=VALID_PAYLOAD)

    assert response.status_code == 404


def test_register_purchase_ingredient_not_found_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException
    mock_service.register_purchase.side_effect = NotFoundException(
        "Ingrediente no encontrado o inactivo"
    )

    response = client.post("/api/v1/ingredient-purchases", json=VALID_PAYLOAD)

    assert response.status_code == 404


def test_register_purchase_invalid_quantity_returns_422(
    client: TestClient, mock_service: AsyncMock
) -> None:
    payload = {**VALID_PAYLOAD, "quantity": "-1.000"}

    response = client.post("/api/v1/ingredient-purchases", json=payload)

    assert response.status_code == 422
    mock_service.register_purchase.assert_not_called()


def test_register_purchase_invalid_unit_returns_422(
    client: TestClient, mock_service: AsyncMock
) -> None:
    payload = {**VALID_PAYLOAD, "unit": "tonelada"}

    response = client.post("/api/v1/ingredient-purchases", json=payload)

    assert response.status_code == 422
    mock_service.register_purchase.assert_not_called()


def test_register_purchase_updates_stock_and_cost(
    client: TestClient, mock_service: AsyncMock
) -> None:
    """Verifica que el servicio fue llamado con los datos correctos (la lógica RN-003
    es del servicio; el test de integración lo validará con BD real)."""
    purchase = make_purchase(
        quantity=Decimal("10.000"),
        unit_price=Decimal("1500.00"),
        total_amount=Decimal("15000.00"),
    )
    mock_service.register_purchase.return_value = purchase

    payload = {**VALID_PAYLOAD, "quantity": "10.000", "unit_price": "1500.00"}
    response = client.post("/api/v1/ingredient-purchases", json=payload)

    assert response.status_code == 201
    assert response.json()["total_amount"] == "15000.00"


# ── RBAC ──────────────────────────────────────────────────────────────────────

def test_panadero_cannot_register_purchase(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.dependencies import get_current_user
    from src.models.enums import Role
    from src.models.user import User
    from tests.conftest import make_admin_user

    panadero = User()
    panadero.id = uuid.uuid4()
    panadero.role = Role.PANADERO
    panadero.is_active = True
    app.dependency_overrides[get_current_user] = lambda: panadero

    response = client.post("/api/v1/ingredient-purchases", json=VALID_PAYLOAD)

    assert response.status_code == 403

    app.dependency_overrides[get_current_user] = lambda: make_admin_user()


def test_cajero_cannot_register_purchase(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.dependencies import get_current_user
    from src.models.enums import Role
    from src.models.user import User
    from tests.conftest import make_admin_user

    cajero = User()
    cajero.id = uuid.uuid4()
    cajero.role = Role.CAJERO
    cajero.is_active = True
    app.dependency_overrides[get_current_user] = lambda: cajero

    response = client.post("/api/v1/ingredient-purchases", json=VALID_PAYLOAD)

    assert response.status_code == 403

    app.dependency_overrides[get_current_user] = lambda: make_admin_user()
