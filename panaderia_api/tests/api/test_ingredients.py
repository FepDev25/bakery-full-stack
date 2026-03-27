import uuid
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from src.api.v1.routes.ingredient import get_service
from src.models.ingredient import Ingredient
from src.models.enums import IngredientUnit


@pytest.fixture
def mock_service() -> AsyncMock:
    service = AsyncMock()
    app.dependency_overrides[get_service] = lambda: service
    yield service
    app.dependency_overrides.pop(get_service, None)


def make_ingredient(**kwargs) -> Ingredient:
    defaults = {
        "id": uuid.uuid4(),
        "name": "Harina",
        "unit": IngredientUnit.KG,
        "stock_quantity": Decimal("50.000"),
        "min_stock_alert": Decimal("10.000"),
        "unit_cost": Decimal("1.50"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    obj = Ingredient()
    for key, value in {**defaults, **kwargs}.items():
        setattr(obj, key, value)
    return obj


VALID_PAYLOAD = {"name": "Harina", "unit": "kg"}


def test_list_ingredients(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.get_all.return_value = [make_ingredient(), make_ingredient(name="Azúcar")]
    mock_service.count_all.return_value = 2

    response = client.get("/api/v1/ingredients")

    assert response.status_code == 200
    assert len(response.json()["items"]) == 2
    assert response.json()["total"] == 2


def test_get_ingredient_ok(client: TestClient, mock_service: AsyncMock) -> None:
    ingredient = make_ingredient()
    mock_service.get_by_id.return_value = ingredient

    response = client.get(f"/api/v1/ingredients/{ingredient.id}")

    assert response.status_code == 200
    assert response.json()["name"] == "Harina"


def test_get_ingredient_not_found(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import NotFoundException
    mock_service.get_by_id.side_effect = NotFoundException("Ingrediente no encontrado")

    response = client.get(f"/api/v1/ingredients/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json()["error"] == "NotFoundException"


def test_create_ingredient_ok(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.create.return_value = make_ingredient()

    response = client.post("/api/v1/ingredients", json=VALID_PAYLOAD)

    assert response.status_code == 201
    assert response.json()["unit"] == "kg"


def test_create_ingredient_invalid_unit(client: TestClient, mock_service: AsyncMock) -> None:
    # Enum inválido — Pydantic rechaza antes de llegar al servicio
    response = client.post("/api/v1/ingredients", json={"name": "X", "unit": "tonelada"})

    assert response.status_code == 422
    mock_service.create.assert_not_called()


def test_create_ingredient_conflict(client: TestClient, mock_service: AsyncMock) -> None:
    from src.core.exceptions import DuplicateEntityError
    mock_service.create.side_effect = DuplicateEntityError("Ya existe un ingrediente con ese nombre")

    response = client.post("/api/v1/ingredients", json=VALID_PAYLOAD)

    assert response.status_code == 409
    assert response.json()["error"] == "DuplicateEntityError"


def test_update_ingredient_ok(client: TestClient, mock_service: AsyncMock) -> None:
    ingredient_id = uuid.uuid4()
    mock_service.update.return_value = make_ingredient(id=ingredient_id, min_stock_alert=Decimal("20.000"))

    response = client.patch(f"/api/v1/ingredients/{ingredient_id}", json={"min_stock_alert": "20.000"})

    assert response.status_code == 200


def test_delete_ingredient_ok(client: TestClient, mock_service: AsyncMock) -> None:
    mock_service.delete.return_value = None

    response = client.delete(f"/api/v1/ingredients/{uuid.uuid4()}")

    assert response.status_code == 204
