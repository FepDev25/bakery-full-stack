"""Tests unitarios para CustomerService — sin base de datos, sin HTTP."""
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from src.core.exceptions import ValidationError
from src.models.customer import Customer
from src.services.customer import CustomerService


def make_customer(loyalty_points: int = 100) -> Customer:
    c = Customer()
    c.id = uuid.uuid4()
    c.name = "María García"
    c.loyalty_points = loyalty_points
    c.is_active = True
    return c


def make_service(customer: Customer) -> tuple[CustomerService, AsyncMock]:
    repo = AsyncMock()
    repo.get_by_id.return_value = customer
    repo.session = AsyncMock()
    return CustomerService(repo=repo), repo


# ── RN-009: Canje de puntos ────────────────────────────────────────────────────

async def test_redeem_points_insufficient_raises_error() -> None:
    customer = make_customer(loyalty_points=50)
    service, _ = make_service(customer)

    with pytest.raises(ValidationError, match="Puntos insuficientes"):
        await service.redeem_points(customer.id, points_to_redeem=100)


async def test_redeem_points_returns_correct_discount() -> None:
    """100 puntos = $10 descuento (1 punto = $0.10)."""
    customer = make_customer(loyalty_points=200)
    service, repo = make_service(customer)

    result = await service.redeem_points(customer.id, points_to_redeem=100)

    assert result.discount_amount == Decimal("10.00")
    assert result.remaining_points == 100
    repo.update_loyalty_points.assert_called_once_with(customer, 100)


async def test_redeem_all_points_leaves_zero() -> None:
    customer = make_customer(loyalty_points=50)
    service, repo = make_service(customer)

    result = await service.redeem_points(customer.id, points_to_redeem=50)

    assert result.discount_amount == Decimal("5.00")
    assert result.remaining_points == 0
    repo.update_loyalty_points.assert_called_once_with(customer, 0)


async def test_redeem_one_point_minimum_discount() -> None:
    """1 punto = $0.10 — la unidad mínima del canje."""
    customer = make_customer(loyalty_points=1)
    service, repo = make_service(customer)

    result = await service.redeem_points(customer.id, points_to_redeem=1)

    assert result.discount_amount == Decimal("0.10")
    assert result.remaining_points == 0
