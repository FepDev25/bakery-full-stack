import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.recipe import get_service
from src.models.enums import IngredientUnit
from src.models.recipe import Recipe
from src.schemas.recipe import ProductionCostResponse


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


def make_recipe(**kwargs) -> Recipe:
    defaults = {
        "id": uuid.uuid4(),
        "product_id": uuid.uuid4(),
        "ingredient_id": uuid.uuid4(),
        "quantity": Decimal("0.500"),
        "unit": IngredientUnit.KG,
        "created_at": datetime.now(timezone.utc),
    }
    obj = Recipe()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    return obj


PRODUCT_ID = uuid.uuid4()

VALID_PAYLOAD = {
    "product_id": str(PRODUCT_ID),
    "ingredient_id": str(uuid.uuid4()),
    "quantity": "0.500",
    "unit": "kg",
}


# ── GET /recipes/product/{product_id} ─────────────────────────────────────────


def test_list_recipes_by_product_returns_200(
    client: TestClient, mock_service: AsyncMock
) -> None:
    mock_service.get_by_product.return_value = [make_recipe(), make_recipe()]

    response = client.get(f"/api/v1/recipes/product/{PRODUCT_ID}")

    assert response.status_code == 200
    assert len(response.json()) == 2


def test_list_recipes_product_not_found_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException

    mock_service.get_by_product.side_effect = NotFoundException(
        "Producto no encontrado o inactivo"
    )

    response = client.get(f"/api/v1/recipes/product/{uuid.uuid4()}")

    assert response.status_code == 404


# ── GET /recipes/product/{product_id}/cost ────────────────────────────────────


def test_get_production_cost_returns_200(
    client: TestClient, mock_service: AsyncMock
) -> None:
    mock_service.get_unit_production_cost.return_value = ProductionCostResponse(
        product_id=PRODUCT_ID,
        cost_per_unit=Decimal("3.75"),
        recipe_count=3,
    )

    response = client.get(f"/api/v1/recipes/product/{PRODUCT_ID}/cost")

    assert response.status_code == 200
    body = response.json()
    assert body["cost_per_unit"] == 3.75
    assert body["recipe_count"] == 3


def test_get_production_cost_no_product_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException

    mock_service.get_unit_production_cost.side_effect = NotFoundException(
        "Producto no encontrado o inactivo"
    )

    response = client.get(f"/api/v1/recipes/product/{uuid.uuid4()}/cost")

    assert response.status_code == 404


# ── GET /recipes/{id} ─────────────────────────────────────────────────────────


def test_get_recipe_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    recipe = make_recipe()
    mock_service.get_by_id.return_value = recipe

    response = client.get(f"/api/v1/recipes/{recipe.id}")

    assert response.status_code == 200
    assert response.json()["unit"] == "kg"


def test_get_recipe_not_found_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException

    mock_service.get_by_id.side_effect = NotFoundException("Receta no encontrada")

    response = client.get(f"/api/v1/recipes/{uuid.uuid4()}")

    assert response.status_code == 404


# ── POST /recipes ─────────────────────────────────────────────────────────────


def test_create_recipe_returns_201(client: TestClient, mock_service: AsyncMock) -> None:
    recipe = make_recipe()
    mock_service.create.return_value = recipe

    response = client.post("/api/v1/recipes", json=VALID_PAYLOAD)

    assert response.status_code == 201
    mock_service.create.assert_called_once()


def test_create_recipe_duplicate_ingredient_returns_409(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import DuplicateEntityError

    mock_service.create.side_effect = DuplicateEntityError(
        "El ingrediente 'Harina' ya está en la receta"
    )

    response = client.post("/api/v1/recipes", json=VALID_PAYLOAD)

    assert response.status_code == 409
    assert response.json()["error"] == "DuplicateEntityError"


def test_create_recipe_product_not_found_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException

    mock_service.create.side_effect = NotFoundException(
        "Producto no encontrado o inactivo"
    )

    response = client.post("/api/v1/recipes", json=VALID_PAYLOAD)

    assert response.status_code == 404


def test_create_recipe_ingredient_not_found_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException

    mock_service.create.side_effect = NotFoundException(
        "Ingrediente no encontrado o inactivo"
    )

    response = client.post("/api/v1/recipes", json=VALID_PAYLOAD)

    assert response.status_code == 404


def test_create_recipe_invalid_quantity_returns_422(
    client: TestClient, mock_service: AsyncMock
) -> None:
    payload = {**VALID_PAYLOAD, "quantity": "-0.5"}

    response = client.post("/api/v1/recipes", json=payload)

    assert response.status_code == 422
    mock_service.create.assert_not_called()


# ── PATCH /recipes/{id} ───────────────────────────────────────────────────────


def test_update_recipe_returns_200(client: TestClient, mock_service: AsyncMock) -> None:
    recipe = make_recipe(quantity=Decimal("1.000"))
    mock_service.update.return_value = recipe

    response = client.patch(f"/api/v1/recipes/{recipe.id}", json={"quantity": "1.000"})

    assert response.status_code == 200
    mock_service.update.assert_called_once()


# ── DELETE /recipes/{id} ──────────────────────────────────────────────────────


def test_delete_recipe_returns_204(client: TestClient, mock_service: AsyncMock) -> None:
    recipe_id = uuid.uuid4()
    mock_service.delete.return_value = None

    response = client.delete(f"/api/v1/recipes/{recipe_id}")

    assert response.status_code == 204


def test_delete_recipe_not_found_returns_404(
    client: TestClient, mock_service: AsyncMock
) -> None:
    from src.core.exceptions import NotFoundException

    mock_service.delete.side_effect = NotFoundException("Receta no encontrada")

    response = client.delete(f"/api/v1/recipes/{uuid.uuid4()}")

    assert response.status_code == 404


# ── RBAC ──────────────────────────────────────────────────────────────────────


def test_cajero_cannot_create_recipe(
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

    response = client.post("/api/v1/recipes", json=VALID_PAYLOAD)

    assert response.status_code == 403

    app.dependency_overrides[get_current_user] = lambda: make_admin_user()
