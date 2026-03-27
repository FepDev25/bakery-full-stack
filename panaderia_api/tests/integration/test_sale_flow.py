"""
Tests de integración: flujo de ventas (RN-001, RN-006, RN-007).

Cubren:
  - La venta real decrementa stock en la BD.
  - Cancelar revierte el stock.
  - El sistema acumula puntos de fidelidad correctamente.
  - Stock insuficiente lanza 400 con mensaje claro.
"""

from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.integration.conftest import (
    create_category,
    create_customer,
    create_product,
)


async def test_create_sale_decrements_product_stock(
    http_client: AsyncClient, db_session: AsyncSession, test_user
) -> None:
    """RN-001: crear venta decrementa stock del producto."""
    cat = await create_category(db_session)
    product = await create_product(db_session, cat.id, stock=Decimal("10.000"), price=Decimal("1000.00"))

    response = await http_client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": str(product.id), "quantity": "3.000"}],
            "payment_method": "efectivo",
            "discount_amount": "0.00",
        },
    )

    assert response.status_code == 201
    await db_session.refresh(product)
    assert product.stock_quantity == Decimal("7.000")


async def test_cancel_sale_reverts_stock(
    http_client: AsyncClient, db_session: AsyncSession, test_user
) -> None:
    """RN-006: cancelar venta del mismo día restaura el stock."""
    cat = await create_category(db_session)
    product = await create_product(db_session, cat.id, stock=Decimal("10.000"), price=Decimal("1000.00"))

    sale_resp = await http_client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": str(product.id), "quantity": "3.000"}],
            "payment_method": "efectivo",
            "discount_amount": "0.00",
        },
    )
    assert sale_resp.status_code == 201
    sale_id = sale_resp.json()["id"]

    cancel_resp = await http_client.post(
        f"/api/v1/sales/{sale_id}/cancel",
        json={"notes": "test cancel"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelada"

    await db_session.refresh(product)
    assert product.stock_quantity == Decimal("10.000")


async def test_create_sale_accumulates_loyalty_points(
    http_client: AsyncClient, db_session: AsyncSession, test_user
) -> None:
    """RN-007: venta de $3000 genera 300 puntos (LOYALTY_POINTS_RATIO=10 por defecto)."""
    cat = await create_category(db_session)
    product = await create_product(db_session, cat.id, stock=Decimal("5.000"), price=Decimal("1000.00"))
    customer = await create_customer(db_session)

    response = await http_client.post(
        "/api/v1/sales",
        json={
            "customer_id": str(customer.id),
            "items": [{"product_id": str(product.id), "quantity": "3.000"}],
            "payment_method": "efectivo",
            "discount_amount": "0.00",
        },
    )
    assert response.status_code == 201

    await db_session.refresh(customer)
    assert customer.loyalty_points == 300


async def test_create_sale_insufficient_stock_returns_400(
    http_client: AsyncClient, db_session: AsyncSession, test_user
) -> None:
    """RN-001: intentar vender más unidades de las disponibles lanza 400."""
    cat = await create_category(db_session)
    product = await create_product(db_session, cat.id, stock=Decimal("2.000"), price=Decimal("500.00"))

    response = await http_client.post(
        "/api/v1/sales",
        json={
            "items": [{"product_id": str(product.id), "quantity": "5.000"}],
            "payment_method": "efectivo",
            "discount_amount": "0.00",
        },
    )

    assert response.status_code == 400
    assert "insuficiente" in response.json()["detail"].lower()

    # El stock no debe haber cambiado
    await db_session.refresh(product)
    assert product.stock_quantity == Decimal("2.000")
