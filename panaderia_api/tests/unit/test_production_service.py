"""Tests unitarios para ProductionService — RN-002 (completar) y RN-008 (descartar)."""
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from src.core.exceptions import InsufficientStockError
from src.models.enums import ProductionBatchStatus
from src.models.ingredient import Ingredient
from src.models.production_batch import ProductionBatch
from src.models.product import Product
from src.models.recipe import Recipe
from src.services.production import ProductionService


def make_batch(quantity: str = "5.000", status=ProductionBatchStatus.EN_PROCESO) -> ProductionBatch:
    b = ProductionBatch()
    b.id = uuid.uuid4()
    b.product_id = uuid.uuid4()
    b.quantity_produced = Decimal(quantity)
    b.status = status
    return b


def make_recipe_with_ingredient(stock: str, quantity_per_unit: str = "2.000") -> Recipe:
    ingredient = Ingredient()
    ingredient.id = uuid.uuid4()
    ingredient.stock_quantity = Decimal(stock)
    ingredient.unit_cost = Decimal("100.00")

    recipe = Recipe()
    recipe.ingredient_id = ingredient.id
    recipe.ingredient = ingredient
    recipe.quantity = Decimal(quantity_per_unit)
    return recipe


def make_service(batch, recipes, locked_ingredient=None, locked_product=None):
    """Construye el servicio con mocks preconfigurados para los escenarios más comunes."""
    batch_repo = AsyncMock()
    batch_repo.session = AsyncMock()

    # Primera llamada → batch en progreso; segunda llamada (reload final) → batch actualizado
    final_batch = ProductionBatch()
    final_batch.id = batch.id
    final_batch.status = ProductionBatchStatus.COMPLETADO
    batch_repo.get_by_id.side_effect = [batch, final_batch]

    recipe_repo = AsyncMock()
    recipe_repo.get_by_product_with_ingredients.return_value = recipes

    ingredient_repo = AsyncMock()
    if locked_ingredient:
        ingredient_repo.get_by_id_with_lock.return_value = locked_ingredient

    product_repo = AsyncMock()
    if locked_product:
        product_repo.get_by_id_with_lock.return_value = locked_product

    return ProductionService(batch_repo, product_repo, ingredient_repo, recipe_repo), product_repo


# ── RN-002: Completar lote ────────────────────────────────────────────────────

async def test_complete_batch_insufficient_ingredients_raises_error() -> None:
    """Si el stock de algún ingrediente no alcanza, falla con InsufficientStockError."""
    batch = make_batch(quantity="5.000")
    # quantity_per_unit=2 × batch=5 = 10 kg needed, but only 1 kg available
    recipe = make_recipe_with_ingredient(stock="1.000", quantity_per_unit="2.000")

    batch_repo = AsyncMock()
    batch_repo.get_by_id.return_value = batch
    batch_repo.session = AsyncMock()

    recipe_repo = AsyncMock()
    recipe_repo.get_by_product_with_ingredients.return_value = [recipe]

    service = ProductionService(batch_repo, AsyncMock(), AsyncMock(), recipe_repo)

    with pytest.raises(InsufficientStockError):
        await service.complete_batch(batch.id)


async def test_complete_batch_increments_product_stock() -> None:
    """RN-002: completar lote añade la cantidad producida al stock del producto."""
    batch = make_batch(quantity="10.000")
    recipe = make_recipe_with_ingredient(stock="50.000", quantity_per_unit="2.000")

    product = Product()
    product.id = batch.product_id
    product.stock_quantity = Decimal("5.000")

    # The locked ingredient that gets stock decremented
    locked_ingredient = recipe.ingredient

    _, product_repo = make_service(batch, [recipe], locked_ingredient=locked_ingredient, locked_product=product)

    service, product_repo = make_service(batch, [recipe], locked_ingredient=locked_ingredient, locked_product=product)
    await service.complete_batch(batch.id)

    assert product.stock_quantity == Decimal("15.000")  # 5 + 10


async def test_complete_batch_decrements_ingredient_stock() -> None:
    """RN-002: los ingredientes son consumidos al completar."""
    batch = make_batch(quantity="3.000")
    recipe = make_recipe_with_ingredient(stock="20.000", quantity_per_unit="2.000")
    locked_ingredient = recipe.ingredient  # same object → mutations are visible

    product = Product()
    product.id = batch.product_id
    product.stock_quantity = Decimal("0.000")

    service, _ = make_service(batch, [recipe], locked_ingredient=locked_ingredient, locked_product=product)
    await service.complete_batch(batch.id)

    # required = 2 * 3 = 6 units consumed
    assert locked_ingredient.stock_quantity == Decimal("14.000")  # 20 - 6


# ── RN-008: Descartar lote (merma) ────────────────────────────────────────────

async def test_discard_batch_does_not_increment_product_stock() -> None:
    """RN-008: descartar NO incrementa el stock del producto (es merma)."""
    batch = make_batch(quantity="5.000")
    recipe = make_recipe_with_ingredient(stock="50.000", quantity_per_unit="1.000")
    locked_ingredient = recipe.ingredient

    batch_repo = AsyncMock()
    batch_repo.session = AsyncMock()
    discarded_batch = ProductionBatch()
    discarded_batch.id = batch.id
    discarded_batch.status = ProductionBatchStatus.DESCARTADO
    batch_repo.get_by_id.side_effect = [batch, discarded_batch]

    ingredient_repo = AsyncMock()
    ingredient_repo.get_by_id_with_lock.return_value = locked_ingredient

    recipe_repo = AsyncMock()
    recipe_repo.get_by_product_with_ingredients.return_value = [recipe]

    product_repo = AsyncMock()

    service = ProductionService(batch_repo, product_repo, ingredient_repo, recipe_repo)
    await service.discard_batch(batch.id)

    # product_repo.get_by_id_with_lock should NEVER be called in discard
    product_repo.get_by_id_with_lock.assert_not_called()


async def test_discard_batch_still_consumes_ingredients() -> None:
    """RN-008: aunque es merma, los ingredientes SÍ se consumen."""
    batch = make_batch(quantity="3.000")
    recipe = make_recipe_with_ingredient(stock="20.000", quantity_per_unit="2.000")
    locked_ingredient = recipe.ingredient

    batch_repo = AsyncMock()
    batch_repo.session = AsyncMock()
    discarded_batch = ProductionBatch()
    discarded_batch.id = batch.id
    discarded_batch.status = ProductionBatchStatus.DESCARTADO
    batch_repo.get_by_id.side_effect = [batch, discarded_batch]

    ingredient_repo = AsyncMock()
    ingredient_repo.get_by_id_with_lock.return_value = locked_ingredient

    recipe_repo = AsyncMock()
    recipe_repo.get_by_product_with_ingredients.return_value = [recipe]

    service = ProductionService(batch_repo, AsyncMock(), ingredient_repo, recipe_repo)
    await service.discard_batch(batch.id)

    # required = 2 * 3 = 6 consumed
    assert locked_ingredient.stock_quantity == Decimal("14.000")
