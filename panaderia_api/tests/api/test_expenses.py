import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.expense import get_service
from src.models.enums import ExpenseCategory
from src.models.expense import Expense


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


def make_expense(**kwargs) -> Expense:
    defaults = {
        "id": uuid.uuid4(),
        "user_id": uuid.uuid4(),
        "category": ExpenseCategory.SERVICIOS,
        "description": "Factura de luz",
        "amount": Decimal("150000.00"),
        "expense_date": date.today(),
        "invoice_number": "FAC-2026-001",
        "notes": None,
        "created_at": datetime.now(timezone.utc),
    }
    obj = Expense()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    return obj


VALID_PAYLOAD = {
    "category": "servicios",
    "description": "Factura de luz",
    "amount": "150000.00",
    "expense_date": str(date.today()),
    "invoice_number": "FAC-2026-001",
}


# ── GET /expenses ─────────────────────────────────────────────────────────────


def test_list_expenses_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_expense(), make_expense()]
    mock_service.count_all.return_value = 2

    response = client.get("/api/v1/expenses")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 2
    assert response.json()["total"] == 2


def test_get_expense_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    expense = make_expense()
    mock_service.get_by_id.return_value = expense

    response = client.get(f"/api/v1/expenses/{expense.id}")

    assert response.status_code == 200
    assert response.json()["category"] == "servicios"
    assert response.json()["amount"] == 150000.0


def test_get_expense_not_found_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException

    mock_service.get_by_id.side_effect = NotFoundException("Gasto no encontrado")

    response = client.get(f"/api/v1/expenses/{uuid.uuid4()}")

    assert response.status_code == 404


# ── POST /expenses ────────────────────────────────────────────────────────────


def test_create_expense_returns_201(
    client: TestClient, mock_service: AsyncMock
) -> None:
    expense = make_expense()
    mock_service.create.return_value = expense

    response = client.post("/api/v1/expenses", json=VALID_PAYLOAD)

    assert response.status_code == 201
    assert response.json()["description"] == "Factura de luz"
    mock_service.create.assert_called_once()


def test_create_expense_inactive_user_returns_400(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import ValidationError

    mock_service.create.side_effect = ValidationError(
        "No se puede registrar un gasto para un usuario inactivo"
    )

    response = client.post("/api/v1/expenses", json=VALID_PAYLOAD)

    assert response.status_code == 400
    assert response.json()["error"] == "ValidationError"


def test_create_expense_invalid_category_returns_422(
    client: TestClient, mock_service: AsyncMock
) -> None:
    payload = {**VALID_PAYLOAD, "category": "vacaciones"}

    response = client.post("/api/v1/expenses", json=payload)

    assert response.status_code == 422
    mock_service.create.assert_not_called()


def test_create_expense_zero_amount_returns_422(
    client: TestClient, mock_service: AsyncMock
) -> None:
    payload = {**VALID_PAYLOAD, "amount": "0.00"}

    response = client.post("/api/v1/expenses", json=payload)

    assert response.status_code == 422
    mock_service.create.assert_not_called()


def test_create_expense_empty_description_returns_422(
    client: TestClient, mock_service: AsyncMock
) -> None:
    payload = {**VALID_PAYLOAD, "description": ""}

    response = client.post("/api/v1/expenses", json=payload)

    assert response.status_code == 422
    mock_service.create.assert_not_called()


# ── PATCH /expenses/{id} ──────────────────────────────────────────────────────


def test_update_expense_returns_200(
    client: TestClient, mock_service: AsyncMock
) -> None:
    expense = make_expense(amount=Decimal("200000.00"))
    mock_service.update.return_value = expense

    response = client.patch(
        f"/api/v1/expenses/{expense.id}",
        json={"amount": "200000.00"},
    )

    assert response.status_code == 200
    mock_service.update.assert_called_once()


def test_update_expense_not_found_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException

    mock_service.update.side_effect = NotFoundException("Gasto no encontrado")

    response = client.patch(
        f"/api/v1/expenses/{uuid.uuid4()}", json={"amount": "100.00"}
    )

    assert response.status_code == 404


# ── DELETE /expenses/{id} ─────────────────────────────────────────────────────


def test_delete_expense_returns_204(
    client: TestClient, mock_service: AsyncMock
) -> None:
    mock_service.delete.return_value = None

    response = client.delete(f"/api/v1/expenses/{uuid.uuid4()}")

    assert response.status_code == 204


def test_delete_expense_not_found_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException

    mock_service.delete.side_effect = NotFoundException("Gasto no encontrado")

    response = client.delete(f"/api/v1/expenses/{uuid.uuid4()}")

    assert response.status_code == 404


# ── RBAC ──────────────────────────────────────────────────────────────────────


def test_panadero_cannot_create_expense(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.dependencies import get_current_user
    from src.models.enums import Role
    from src.models.user import User
    from tests.conftest import make_admin_user

    panadero = User()
    panadero.id = uuid.uuid4()
    panadero.role = Role.PANADERO
    panadero.is_active = True
    app.dependency_overrides[get_current_user] = lambda: panadero

    response = client.post("/api/v1/expenses", json=VALID_PAYLOAD)

    assert response.status_code == 403

    app.dependency_overrides[get_current_user] = lambda: make_admin_user()


def test_cajero_cannot_list_expenses(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.dependencies import get_current_user
    from src.models.enums import Role
    from src.models.user import User
    from tests.conftest import make_admin_user

    cajero = User()
    cajero.id = uuid.uuid4()
    cajero.role = Role.CAJERO
    cajero.is_active = True
    app.dependency_overrides[get_current_user] = lambda: cajero

    response = client.get("/api/v1/expenses")

    assert response.status_code == 403

    app.dependency_overrides[get_current_user] = lambda: make_admin_user()


def test_contador_can_create_expense(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.dependencies import get_current_user
    from src.models.enums import Role
    from src.models.user import User
    from tests.conftest import make_admin_user

    expense = make_expense()
    mock_service.create.return_value = expense

    contador = User()
    contador.id = uuid.uuid4()
    contador.role = Role.CONTADOR
    contador.is_active = True
    app.dependency_overrides[get_current_user] = lambda: contador

    response = client.post("/api/v1/expenses", json=VALID_PAYLOAD)

    assert response.status_code == 201

    app.dependency_overrides[get_current_user] = lambda: make_admin_user()
