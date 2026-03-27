"""
Tests de integración: flujo de lotes de producción (RN-002, RN-008).

Cubren:
  - Completar un lote incrementa el stock del producto.
  - Completar un lote decrementa los ingredientes según la receta × cantidad.
  - Descartar un lote (merma) no incrementa el stock del producto.
  - Completar con ingredientes insuficientes lanza 400.
"""

from datetime import date
from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration.conftest import (
    create_category,
    create_ingredient,
    create_product,
    create_recipe,
)

_TODAY = str(date.today())


async def test_complete_batch_increments_product_stock(
    http_client: AsyncClient, db_session: AsyncSession, test_user
) -> None:
    """RN-002: completar lote de 3 unidades suma 3 al stock del producto."""
    cat = await create_category(db_session)
    product = await create_product(db_session, cat.id, stock=Decimal("0.000"))
    ingredient = await create_ingredient(db_session, stock=Decimal("20.000"))
    await create_recipe(db_session, product.id, ingredient.id, quantity=Decimal("2.000"))

    create_resp = await http_client.post(
        "/api/v1/production-batches",
        json={
            "product_id": str(product.id),
            "quantity_produced": "3.000",
            "unit": "unidad",
            "production_date": _TODAY,
        },
    )
    assert create_resp.status_code == 201
    batch_id = create_resp.json()["id"]

    complete_resp = await http_client.post(f"/api/v1/production-batches/{batch_id}/complete")
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "completado"

    await db_session.refresh(product)
    assert product.stock_quantity == Decimal("3.000")


async def test_complete_batch_decrements_ingredient_stock(
    http_client: AsyncClient, db_session: AsyncSession, test_user
) -> None:
    """RN-002: completar lote (3 unidades × 2 kg/u) consume 6 kg de ingrediente."""
    cat = await create_category(db_session)
    product = await create_product(db_session, cat.id, stock=Decimal("0.000"))
    ingredient = await create_ingredient(db_session, stock=Decimal("20.000"))
    await create_recipe(db_session, product.id, ingredient.id, quantity=Decimal("2.000"))

    create_resp = await http_client.post(
        "/api/v1/production-batches",
        json={
            "product_id": str(product.id),
            "quantity_produced": "3.000",
            "unit": "unidad",
            "production_date": _TODAY,
        },
    )
    batch_id = create_resp.json()["id"]

    await http_client.post(f"/api/v1/production-batches/{batch_id}/complete")

    await db_session.refresh(ingredient)
    # 20 - (2 × 3) = 14
    assert ingredient.stock_quantity == Decimal("14.000")


async def test_discard_batch_does_not_increment_product_stock(
    http_client: AsyncClient, db_session: AsyncSession, test_user
) -> None:
    """RN-008: descartar lote consume ingredientes pero NO suma stock al producto."""
    cat = await create_category(db_session)
    product = await create_product(db_session, cat.id, stock=Decimal("0.000"))
    ingredient = await create_ingredient(db_session, stock=Decimal("20.000"))
    await create_recipe(db_session, product.id, ingredient.id, quantity=Decimal("1.000"))

    create_resp = await http_client.post(
        "/api/v1/production-batches",
        json={
            "product_id": str(product.id),
            "quantity_produced": "2.000",
            "unit": "unidad",
            "production_date": _TODAY,
        },
    )
    batch_id = create_resp.json()["id"]

    discard_resp = await http_client.post(f"/api/v1/production-batches/{batch_id}/discard")
    assert discard_resp.status_code == 200
    assert discard_resp.json()["status"] == "descartado"

    await db_session.refresh(product)
    assert product.stock_quantity == Decimal("0.000")  # no cambió

    await db_session.refresh(ingredient)
    assert ingredient.stock_quantity == Decimal("18.000")  # 20 - (1 × 2) = 18


async def test_complete_batch_insufficient_ingredients_returns_400(
    http_client: AsyncClient, db_session: AsyncSession, test_user
) -> None:
    """RN-002: completar lote con stock de ingrediente insuficiente lanza 400."""
    cat = await create_category(db_session)
    product = await create_product(db_session, cat.id, stock=Decimal("0.000"))
    ingredient = await create_ingredient(db_session, stock=Decimal("1.000"))  # solo 1 kg
    await create_recipe(db_session, product.id, ingredient.id, quantity=Decimal("2.000"))  # necesita 2 kg/u

    create_resp = await http_client.post(
        "/api/v1/production-batches",
        json={
            "product_id": str(product.id),
            "quantity_produced": "3.000",  # necesita 6 kg, solo hay 1
            "unit": "unidad",
            "production_date": _TODAY,
        },
    )
    assert create_resp.status_code == 201
    batch_id = create_resp.json()["id"]

    complete_resp = await http_client.post(f"/api/v1/production-batches/{batch_id}/complete")
    assert complete_resp.status_code == 400
    assert "insuficiente" in complete_resp.json()["detail"].lower()

    # El stock del ingrediente no debe haber cambiado
    await db_session.refresh(ingredient)
    assert ingredient.stock_quantity == Decimal("1.000")
