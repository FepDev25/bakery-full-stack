"""Tests unitarios para PurchaseService — RN-003: costo promedio ponderado."""
import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from src.core.exceptions import NotFoundException
from src.models.enums import IngredientUnit
from src.models.ingredient import Ingredient
from src.models.ingredient_purchase import IngredientPurchase
from src.models.supplier import Supplier
from src.schemas.ingredient_purchase import IngredientPurchaseCreate
from src.services.purchase import PurchaseService


def make_supplier() -> Supplier:
    s = Supplier()
    s.id = uuid.uuid4()
    s.name = "Harinera del Valle"
    s.is_active = True
    return s


def make_ingredient(stock: str = "0.000", unit_cost: str = "0.00") -> Ingredient:
    i = Ingredient()
    i.id = uuid.uuid4()
    i.name = "Harina"
    i.stock_quantity = Decimal(stock)
    i.unit_cost = Decimal(unit_cost)
    i.is_active = True
    return i


def make_purchase_data(ingredient_id, supplier_id, quantity: str, unit_price: str) -> IngredientPurchaseCreate:
    return IngredientPurchaseCreate(
        supplier_id=supplier_id,
        ingredient_id=ingredient_id,
        quantity=Decimal(quantity),
        unit=IngredientUnit.KG,
        unit_price=Decimal(unit_price),
        purchase_date=date.today(),
    )


def make_service(supplier, ingredient):
    purchase_repo = AsyncMock()
    purchase = IngredientPurchase()
    purchase.id = uuid.uuid4()
    purchase_repo.create.return_value = purchase
    purchase_repo.session = AsyncMock()

    ingredient_repo = AsyncMock()
    ingredient_repo.get_by_id_with_lock.return_value = ingredient

    supplier_repo = AsyncMock()
    supplier_repo.get_by_id.return_value = supplier

    return PurchaseService(purchase_repo, ingredient_repo, supplier_repo), ingredient_repo


# ── RN-003: fórmula de costo promedio ponderado ───────────────────────────────

async def test_zero_stock_uses_purchase_price_directly() -> None:
    """Si stock == 0, el nuevo costo unitario = precio de compra."""
    ingredient = make_ingredient(stock="0.000", unit_cost="0.00")
    supplier = make_supplier()
    service, ingredient_repo = make_service(supplier, ingredient)

    data = make_purchase_data(ingredient.id, supplier.id, quantity="5.000", unit_price="2000.00")
    await service.register_purchase(data, user_id=uuid.uuid4())

    ingredient_repo.update_stock_and_cost.assert_called_once()
    _, new_stock, new_cost = ingredient_repo.update_stock_and_cost.call_args[0]
    assert new_stock == Decimal("5.000")
    assert new_cost == Decimal("2000.00")


async def test_existing_stock_applies_weighted_average() -> None:
    """
    stock=10 kg a $1000, compra 5 kg a $2000.
    CPP = (10*1000 + 5*2000) / 15 = 20000/15 = $1333.33
    """
    ingredient = make_ingredient(stock="10.000", unit_cost="1000.00")
    supplier = make_supplier()
    service, ingredient_repo = make_service(supplier, ingredient)

    data = make_purchase_data(ingredient.id, supplier.id, quantity="5.000", unit_price="2000.00")
    await service.register_purchase(data, user_id=uuid.uuid4())

    ingredient_repo.update_stock_and_cost.assert_called_once()
    _, new_stock, new_cost = ingredient_repo.update_stock_and_cost.call_args[0]
    assert new_stock == Decimal("15.000")
    assert new_cost == Decimal("1333.33")


async def test_equal_price_keeps_same_cost() -> None:
    """Si el precio nuevo == costo actual, el CPP no cambia."""
    ingredient = make_ingredient(stock="10.000", unit_cost="1500.00")
    supplier = make_supplier()
    service, ingredient_repo = make_service(supplier, ingredient)

    data = make_purchase_data(ingredient.id, supplier.id, quantity="10.000", unit_price="1500.00")
    await service.register_purchase(data, user_id=uuid.uuid4())

    _, _, new_cost = ingredient_repo.update_stock_and_cost.call_args[0]
    assert new_cost == Decimal("1500.00")


async def test_inactive_ingredient_raises_not_found() -> None:
    ingredient = make_ingredient()
    ingredient.is_active = False
    supplier = make_supplier()
    service, _ = make_service(supplier, ingredient)

    data = make_purchase_data(ingredient.id, supplier.id, quantity="5.000", unit_price="1000.00")

    with pytest.raises(NotFoundException, match="Ingrediente"):
        await service.register_purchase(data, user_id=uuid.uuid4())


async def test_inactive_supplier_raises_not_found() -> None:
    ingredient = make_ingredient(stock="5.000", unit_cost="1000.00")
    supplier = make_supplier()
    supplier.is_active = False
    service, _ = make_service(supplier, ingredient)

    data = make_purchase_data(ingredient.id, supplier.id, quantity="5.000", unit_price="1000.00")

    with pytest.raises(NotFoundException, match="Proveedor"):
        await service.register_purchase(data, user_id=uuid.uuid4())


async def test_total_amount_is_quantity_times_unit_price() -> None:
    """total_amount = quantity × unit_price, calculado por el servicio."""
    ingredient = make_ingredient(stock="0.000", unit_cost="0.00")
    supplier = make_supplier()

    purchase_repo = AsyncMock()
    purchase_repo.session = AsyncMock()
    expected_total = Decimal("10000.00")  # 5 × 2000

    recorded_purchase = IngredientPurchase()
    recorded_purchase.id = uuid.uuid4()
    purchase_repo.create.return_value = recorded_purchase

    ingredient_repo = AsyncMock()
    ingredient_repo.get_by_id_with_lock.return_value = ingredient

    supplier_repo = AsyncMock()
    supplier_repo.get_by_id.return_value = supplier

    service = PurchaseService(purchase_repo, ingredient_repo, supplier_repo)
    data = make_purchase_data(ingredient.id, supplier.id, quantity="5.000", unit_price="2000.00")
    await service.register_purchase(data, user_id=uuid.uuid4())

    call_kwargs = purchase_repo.create.call_args
    assert call_kwargs[1]["total_amount"] == expected_total
