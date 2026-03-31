"""
Tests de integración para ToolExecutor.

Qué prueban:
  - Cada tool devuelve la estructura de datos esperada.
  - Los cálculos de agregación son correctos y consistentes.
  - Los parámetros opcionales funcionan (filtros, límites, ordenamiento).
  - Entradas inválidas o sin datos devuelven {"error": ...} sin lanzar excepción.

No invocan el LLM. Usan la BD de test con rollback automático por test.
"""

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.ai.tool_executor import ToolExecutor
from src.models.enums import (
    IngredientUnit,
    PaymentMethod,
    ProductionBatchStatus,
    ProductUnit,
    SaleStatus,
)
from src.models.expense import Expense
from src.models.ingredient import Ingredient
from src.models.ingredient_purchase import IngredientPurchase
from src.models.production_batch import ProductionBatch
from src.models.sale import Sale
from src.models.sale_item import SaleItem
from src.models.supplier import Supplier
from tests.integration.conftest import (
    create_category,
    create_customer,
    create_product,
    _create_user,
)


# ── Factories locales ─────────────────────────────────────────────────────────

async def create_supplier(session: AsyncSession) -> Supplier:
    s = Supplier(
        name=f"Proveedor {uuid.uuid4().hex[:8]}",
        phone=f"011-{uuid.uuid4().int % 90000000 + 10000000}",  # chk_suppliers_contact exige phone OR email
        is_active=True,
    )
    session.add(s)
    await session.flush()
    return s


async def create_ingredient(
    session: AsyncSession,
    name: str | None = None,
    stock: Decimal = Decimal("50.000"),
    min_stock: Decimal = Decimal("10.000"),
    unit_cost: Decimal = Decimal("500.00"),
) -> Ingredient:
    ing = Ingredient(
        name=name or f"Ingrediente {uuid.uuid4().hex[:6]}",
        unit=IngredientUnit.KG,
        stock_quantity=stock,
        min_stock_alert=min_stock,
        unit_cost=unit_cost,
        is_active=True,
    )
    session.add(ing)
    await session.flush()
    return ing


async def create_sale(
    session: AsyncSession,
    user_id: uuid.UUID,
    total: Decimal = Decimal("1000.00"),
    sale_date: date | None = None,
    status: SaleStatus = SaleStatus.COMPLETADA,
    customer_id: uuid.UUID | None = None,
) -> Sale:
    d = sale_date or date.today()
    sale_dt = datetime(d.year, d.month, d.day, 10, 0, 0, tzinfo=timezone.utc)
    sale = Sale(
        sale_number=f"VTA-TEST-{uuid.uuid4().hex[:8]}",
        user_id=user_id,
        customer_id=customer_id,
        subtotal=total,
        discount_amount=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        total_amount=total,
        payment_method=PaymentMethod.EFECTIVO,
        status=status,
        sale_date=sale_dt,
    )
    session.add(sale)
    await session.flush()
    return sale


async def create_sale_item(
    session: AsyncSession,
    sale_id: uuid.UUID,
    product_id: uuid.UUID,
    quantity: Decimal = Decimal("2.000"),
    unit_price: Decimal = Decimal("500.00"),
) -> SaleItem:
    subtotal = quantity * unit_price
    item = SaleItem(
        sale_id=sale_id,
        product_id=product_id,
        quantity=quantity,
        unit="unidad",
        unit_price=unit_price,
        subtotal=subtotal,
    )
    session.add(item)
    await session.flush()
    return item


async def create_production_batch(
    session: AsyncSession,
    product_id: uuid.UUID,
    user_id: uuid.UUID,
    status: ProductionBatchStatus = ProductionBatchStatus.COMPLETADO,
    production_date: date | None = None,
    ingredient_cost: Decimal = Decimal("200.00"),
    quantity: Decimal = Decimal("50.000"),
) -> ProductionBatch:
    batch = ProductionBatch(
        product_id=product_id,
        user_id=user_id,
        quantity_produced=quantity,
        unit="unidad",
        production_date=production_date or date.today(),
        ingredient_cost=ingredient_cost,
        status=status,
    )
    session.add(batch)
    await session.flush()
    return batch


async def create_expense(
    session: AsyncSession,
    user_id: uuid.UUID,
    amount: Decimal = Decimal("50000.00"),
    category: str = "alquiler",
    expense_date: date | None = None,
    description: str = "Gasto de prueba",
) -> Expense:
    expense = Expense(
        user_id=user_id,
        category=category,
        description=description,
        amount=amount,
        expense_date=expense_date or date.today(),
    )
    session.add(expense)
    await session.flush()
    return expense


async def create_purchase(
    session: AsyncSession,
    supplier_id: uuid.UUID,
    ingredient_id: uuid.UUID,
    user_id: uuid.UUID,
    unit_price: Decimal = Decimal("450.00"),
    quantity: int = 100,
    purchase_date: date | None = None,
) -> IngredientPurchase:
    qty = Decimal(str(quantity))
    purchase = IngredientPurchase(
        supplier_id=supplier_id,
        ingredient_id=ingredient_id,
        user_id=user_id,
        quantity=qty,
        unit="kg",
        unit_price=unit_price,
        total_amount=qty * unit_price,
        purchase_date=purchase_date or date.today(),
    )
    session.add(purchase)
    await session.flush()
    return purchase


# ── get_sales_summary ─────────────────────────────────────────────────────────

async def test_sales_summary_totals(db_session: AsyncSession, test_user) -> None:
    """Suma correctamente revenue, count y avg_ticket de ventas completadas."""
    cat = await create_category(db_session)
    prod = await create_product(db_session, cat.id, price=Decimal("1000.00"))

    today = date.today()
    sale_a = await create_sale(db_session, test_user.id, total=Decimal("3000.00"), sale_date=today)
    sale_b = await create_sale(db_session, test_user.id, total=Decimal("1000.00"), sale_date=today)
    for sale in (sale_a, sale_b):
        await create_sale_item(db_session, sale.id, prod.id)

    executor = ToolExecutor(db_session)
    result = await executor.get_sales_summary(today.isoformat(), today.isoformat())

    assert result["sale_count"] >= 2
    assert result["total_revenue"] >= 4000.0
    assert result["avg_ticket"] == pytest.approx(
        result["total_revenue"] / result["sale_count"], rel=0.01
    )
    assert "cancelled_count" in result


async def test_sales_summary_cancelled_not_counted_in_revenue(
    db_session: AsyncSession, test_user
) -> None:
    """Las ventas canceladas no se cuentan en el revenue de completadas."""
    today = date.today()
    await create_sale(db_session, test_user.id, total=Decimal("5000.00"), sale_date=today)
    await create_sale(
        db_session, test_user.id,
        total=Decimal("9999.00"),
        sale_date=today,
        status=SaleStatus.CANCELADA,
    )

    executor = ToolExecutor(db_session)
    result = await executor.get_sales_summary(today.isoformat(), today.isoformat())

    assert result["total_revenue"] < 9999.0
    assert result["cancelled_count"] >= 1


async def test_sales_summary_empty_period(db_session: AsyncSession, test_user) -> None:
    """Período sin ventas devuelve ceros, no error."""
    past = (date.today() - timedelta(days=365)).isoformat()

    executor = ToolExecutor(db_session)
    result = await executor.get_sales_summary(past, past)

    assert result["sale_count"] == 0
    assert result["total_revenue"] == 0.0
    assert "error" not in result


# ── get_top_products ──────────────────────────────────────────────────────────

async def test_top_products_returns_ordered_by_revenue(
    db_session: AsyncSession, test_user
) -> None:
    """El producto con más revenue aparece primero."""
    cat = await create_category(db_session)
    prod_cheap = await create_product(db_session, cat.id, price=Decimal("100.00"), name="Barato")
    prod_expensive = await create_product(db_session, cat.id, price=Decimal("5000.00"), name="Caro")

    today = date.today()
    sale = await create_sale(db_session, test_user.id, total=Decimal("5100.00"), sale_date=today)
    await create_sale_item(db_session, sale.id, prod_cheap.id, quantity=Decimal("1"), unit_price=Decimal("100.00"))
    await create_sale_item(db_session, sale.id, prod_expensive.id, quantity=Decimal("1"), unit_price=Decimal("5000.00"))

    executor = ToolExecutor(db_session)
    result = await executor.get_top_products("today", limit=2, by="revenue")

    assert len(result["products"]) >= 1
    assert result["products"][0]["total_revenue"] >= result["products"][-1]["total_revenue"]


async def test_top_products_limit_respected(db_session: AsyncSession, test_user) -> None:
    """El parámetro limit acota la cantidad de productos devueltos."""
    cat = await create_category(db_session)
    today = date.today()
    sale = await create_sale(db_session, test_user.id, total=Decimal("3000.00"), sale_date=today)

    for i in range(5):
        prod = await create_product(db_session, cat.id, price=Decimal("600.00"), name=f"Prod {i}")
        await create_sale_item(db_session, sale.id, prod.id, quantity=Decimal("1"), unit_price=Decimal("600.00"))

    executor = ToolExecutor(db_session)
    result = await executor.get_top_products("today", limit=3)

    assert len(result["products"]) <= 3


async def test_top_products_by_quantity(db_session: AsyncSession, test_user) -> None:
    """Ordenar por quantity devuelve el de mayor unidades primero."""
    cat = await create_category(db_session)
    today = date.today()
    sale = await create_sale(db_session, test_user.id, total=Decimal("6000.00"), sale_date=today)

    prod_many = await create_product(db_session, cat.id, price=Decimal("100.00"), name="Muchas unidades")
    prod_few = await create_product(db_session, cat.id, price=Decimal("2000.00"), name="Pocas unidades")

    await create_sale_item(db_session, sale.id, prod_many.id, quantity=Decimal("10"), unit_price=Decimal("100.00"))
    await create_sale_item(db_session, sale.id, prod_few.id, quantity=Decimal("2"), unit_price=Decimal("2000.00"))

    executor = ToolExecutor(db_session)
    result = await executor.get_top_products("today", limit=2, by="quantity")

    assert result["products"][0]["total_quantity"] >= result["products"][1]["total_quantity"]


# ── get_stock_status ──────────────────────────────────────────────────────────

async def test_stock_status_returns_products_and_ingredients(
    db_session: AsyncSession, test_user
) -> None:
    """Con type='both' devuelve ambas secciones con alert_count."""
    cat = await create_category(db_session)
    await create_product(db_session, cat.id, stock=Decimal("20.000"))
    await create_ingredient(db_session, stock=Decimal("30.000"))

    executor = ToolExecutor(db_session)
    result = await executor.get_stock_status(type="both")

    assert "products" in result
    assert "ingredients" in result
    assert "alert_count" in result
    assert isinstance(result["alert_count"], int)


async def test_stock_status_only_alerts_filters_correctly(
    db_session: AsyncSession, test_user
) -> None:
    """only_alerts=True devuelve solo ítems con stock <= min_stock_alert."""
    await create_ingredient(
        db_session,
        name=f"Bajo stock {uuid.uuid4().hex[:4]}",
        stock=Decimal("5.000"),
        min_stock=Decimal("10.000"),
    )
    await create_ingredient(
        db_session,
        name=f"Stock ok {uuid.uuid4().hex[:4]}",
        stock=Decimal("50.000"),
        min_stock=Decimal("10.000"),
    )

    executor = ToolExecutor(db_session)
    result = await executor.get_stock_status(type="ingredients", only_alerts=True)

    for item in result["ingredients"]:
        assert item["is_low"] is True


async def test_stock_status_is_low_flag(db_session: AsyncSession, test_user) -> None:
    """El campo is_low refleja correctamente el estado de cada ítem."""
    ing_ok = await create_ingredient(
        db_session, stock=Decimal("20.000"), min_stock=Decimal("5.000")
    )
    ing_low = await create_ingredient(
        db_session, stock=Decimal("3.000"), min_stock=Decimal("10.000")
    )

    executor = ToolExecutor(db_session)
    result = await executor.get_stock_status(type="ingredients", only_alerts=False)

    names = {i["name"]: i["is_low"] for i in result["ingredients"]}
    assert names[ing_ok.name] is False
    assert names[ing_low.name] is True


# ── get_production_stats ──────────────────────────────────────────────────────

async def test_production_stats_counts_statuses(
    db_session: AsyncSession, test_user
) -> None:
    """Cuenta correctamente completados vs descartados y calcula waste_rate_pct."""
    cat = await create_category(db_session)
    prod = await create_product(db_session, cat.id)
    today = date.today()

    await create_production_batch(db_session, prod.id, test_user.id, status=ProductionBatchStatus.COMPLETADO, production_date=today)
    await create_production_batch(db_session, prod.id, test_user.id, status=ProductionBatchStatus.COMPLETADO, production_date=today)
    await create_production_batch(db_session, prod.id, test_user.id, status=ProductionBatchStatus.DESCARTADO, production_date=today)

    executor = ToolExecutor(db_session)
    result = await executor.get_production_stats(today.isoformat(), today.isoformat())

    assert result["completed_batches"] >= 2
    assert result["discarded_batches"] >= 1
    # waste_rate = 1/3 ≈ 33.3%
    assert result["waste_rate_pct"] == pytest.approx(33.3, abs=1.0)


async def test_production_stats_cost_aggregation(
    db_session: AsyncSession, test_user
) -> None:
    """El costo total suma completados + descartados (ambos consumen ingredientes)."""
    cat = await create_category(db_session)
    prod = await create_product(db_session, cat.id)
    today = date.today()

    await create_production_batch(
        db_session, prod.id, test_user.id,
        status=ProductionBatchStatus.COMPLETADO,
        ingredient_cost=Decimal("1000.00"),
        production_date=today,
    )
    await create_production_batch(
        db_session, prod.id, test_user.id,
        status=ProductionBatchStatus.DESCARTADO,
        ingredient_cost=Decimal("500.00"),
        production_date=today,
    )

    executor = ToolExecutor(db_session)
    result = await executor.get_production_stats(today.isoformat(), today.isoformat())

    assert result["total_ingredient_cost"] == pytest.approx(1500.0, rel=0.01)


async def test_production_stats_empty_period(db_session: AsyncSession, test_user) -> None:
    """Período sin lotes devuelve ceros, no error."""
    past = (date.today() - timedelta(days=365)).isoformat()

    executor = ToolExecutor(db_session)
    result = await executor.get_production_stats(past, past)

    assert result["completed_batches"] == 0
    assert result["discarded_batches"] == 0
    assert result["waste_rate_pct"] == 0.0
    assert "error" not in result


# ── get_expense_summary ───────────────────────────────────────────────────────

async def test_expense_summary_totals_and_breakdown(
    db_session: AsyncSession, test_user
) -> None:
    """Suma total correcta y el breakdown por categoría cierra al 100%."""
    today = date.today()
    await create_expense(db_session, test_user.id, amount=Decimal("100000.00"), category="alquiler", expense_date=today)
    await create_expense(db_session, test_user.id, amount=Decimal("50000.00"), category="servicios", expense_date=today)

    executor = ToolExecutor(db_session)
    result = await executor.get_expense_summary(today.isoformat(), today.isoformat())

    assert result["total_expenses"] >= 150000.0
    total_pct = sum(c["pct_of_total"] for c in result["by_category"])
    assert total_pct == pytest.approx(100.0, abs=1.0)


async def test_expense_summary_category_filter(
    db_session: AsyncSession, test_user
) -> None:
    """Filtrar por categoría devuelve solo esa categoría."""
    today = date.today()
    await create_expense(db_session, test_user.id, amount=Decimal("80000.00"), category="salarios", expense_date=today)
    await create_expense(db_session, test_user.id, amount=Decimal("30000.00"), category="marketing", expense_date=today)

    executor = ToolExecutor(db_session)
    result = await executor.get_expense_summary(today.isoformat(), today.isoformat(), category="salarios")

    assert len(result["by_category"]) == 1
    assert result["by_category"][0]["category"] == "salarios"


async def test_expense_summary_empty_period(db_session: AsyncSession, test_user) -> None:
    """Período sin gastos devuelve total 0, no error."""
    past = (date.today() - timedelta(days=365)).isoformat()

    executor = ToolExecutor(db_session)
    result = await executor.get_expense_summary(past, past)

    assert result["total_expenses"] == 0.0
    assert "error" not in result


# ── get_ingredient_cost_trend ─────────────────────────────────────────────────

async def test_ingredient_cost_trend_detects_price_increase(
    db_session: AsyncSession, test_user
) -> None:
    """price_change_pct es positivo cuando el precio reciente es mayor al anterior."""
    supplier = await create_supplier(db_session)
    ing = await create_ingredient(db_session, name="Harina Test")
    today = date.today()

    await create_purchase(
        db_session, supplier.id, ing.id, test_user.id,
        unit_price=Decimal("400.00"),
        quantity=50,
        purchase_date=today - timedelta(days=60),
    )
    await create_purchase(
        db_session, supplier.id, ing.id, test_user.id,
        unit_price=Decimal("460.00"),
        quantity=50,
        purchase_date=today - timedelta(days=5),
    )

    executor = ToolExecutor(db_session)
    result = await executor.get_ingredient_cost_trend("Harina Test", last_n_purchases=10)

    assert "error" not in result
    assert result["price_change_pct"] > 0
    assert result["max_price"] >= result["min_price"]
    assert result["avg_price"] > 0


async def test_ingredient_cost_trend_structure(
    db_session: AsyncSession, test_user
) -> None:
    """Cada compra en el resultado tiene los campos requeridos."""
    supplier = await create_supplier(db_session)
    ing = await create_ingredient(db_session, name=f"Ingrediente {uuid.uuid4().hex[:6]}")

    await create_purchase(db_session, supplier.id, ing.id, test_user.id)

    executor = ToolExecutor(db_session)
    result = await executor.get_ingredient_cost_trend(ing.name)

    assert len(result["purchases"]) >= 1
    purchase = result["purchases"][0]
    for field in ("date", "supplier", "unit_price", "quantity", "unit"):
        assert field in purchase, f"Campo faltante: {field}"


async def test_ingredient_cost_trend_not_found(
    db_session: AsyncSession, test_user
) -> None:
    """Ingrediente inexistente devuelve {"error": ...}, no lanza excepción."""
    executor = ToolExecutor(db_session)
    result = await executor.get_ingredient_cost_trend("XYZ_INGREDIENTE_INEXISTENTE_123")

    assert "error" in result


# ── search_catalog ────────────────────────────────────────────────────────────

async def test_search_catalog_returns_both_by_default(
    db_session: AsyncSession, test_user
) -> None:
    """Sin parámetros devuelve productos e ingredientes activos."""
    cat = await create_category(db_session)
    await create_product(db_session, cat.id, name="Producto Catálogo Test")
    await create_ingredient(db_session, name="Ingrediente Catálogo Test")

    executor = ToolExecutor(db_session)
    result = await executor.search_catalog()

    assert "products" in result
    assert "ingredients" in result
    names_p = [p["name"] for p in result["products"]]
    names_i = [i["name"] for i in result["ingredients"]]
    assert "Producto Catálogo Test" in names_p
    assert "Ingrediente Catálogo Test" in names_i


async def test_search_catalog_query_filter(
    db_session: AsyncSession, test_user
) -> None:
    """El filtro query hace búsqueda aproximada por nombre."""
    await create_ingredient(db_session, name="Harina 000 Test")
    await create_ingredient(db_session, name="Harina Integral Test")
    await create_ingredient(db_session, name="Levadura Test")

    executor = ToolExecutor(db_session)
    result = await executor.search_catalog(type="ingredients", query="harina")

    names = [i["name"] for i in result["ingredients"]]
    assert any("Harina" in n for n in names)
    assert not any("Levadura" in n for n in names)


async def test_search_catalog_type_products_only(
    db_session: AsyncSession, test_user
) -> None:
    """type='products' no devuelve la clave 'ingredients'."""
    cat = await create_category(db_session)
    await create_product(db_session, cat.id)

    executor = ToolExecutor(db_session)
    result = await executor.search_catalog(type="products")

    assert "products" in result
    assert "ingredients" not in result


async def test_search_catalog_product_has_price(
    db_session: AsyncSession, test_user
) -> None:
    """Cada producto en el catálogo incluye nombre, unidad y precio."""
    cat = await create_category(db_session)
    await create_product(db_session, cat.id, price=Decimal("1500.00"), name="Pan Test")

    executor = ToolExecutor(db_session)
    result = await executor.search_catalog(type="products", query="Pan Test")

    assert len(result["products"]) >= 1
    prod = result["products"][0]
    assert "name" in prod
    assert "unit" in prod
    assert "price" in prod
    assert prod["price"] == 1500.0


async def test_search_catalog_no_match_returns_empty_list(
    db_session: AsyncSession, test_user
) -> None:
    """Query sin coincidencias devuelve lista vacía, no error."""
    executor = ToolExecutor(db_session)
    result = await executor.search_catalog(type="ingredients", query="XYZ_INEXISTENTE_999")

    assert "ingredients" in result
    assert result["ingredients"] == []
    assert "error" not in result


# ── get_customer_stats ────────────────────────────────────────────────────────

async def test_customer_stats_order_by_total_spent(
    db_session: AsyncSession, test_user
) -> None:
    """Los clientes aparecen ordenados de mayor a menor por total gastado."""
    cat = await create_category(db_session)
    prod = await create_product(db_session, cat.id, price=Decimal("1000.00"))
    today = date.today()

    customer_vip = await create_customer(db_session, name="VIP")
    customer_low = await create_customer(db_session, name="Ocasional")

    sale_vip = await create_sale(
        db_session, test_user.id, total=Decimal("9000.00"),
        sale_date=today, customer_id=customer_vip.id,
    )
    sale_low = await create_sale(
        db_session, test_user.id, total=Decimal("1000.00"),
        sale_date=today, customer_id=customer_low.id,
    )
    await create_sale_item(db_session, sale_vip.id, prod.id, quantity=Decimal("9"), unit_price=Decimal("1000.00"))
    await create_sale_item(db_session, sale_low.id, prod.id, quantity=Decimal("1"), unit_price=Decimal("1000.00"))

    executor = ToolExecutor(db_session)
    result = await executor.get_customer_stats(limit=10, order_by="total_spent")

    names = [c["customer_name"] for c in result["customers"]]
    assert names.index("VIP") < names.index("Ocasional")


async def test_customer_stats_structure(db_session: AsyncSession, test_user) -> None:
    """Cada cliente en el resultado tiene todos los campos requeridos."""
    await create_customer(db_session)

    executor = ToolExecutor(db_session)
    result = await executor.get_customer_stats(limit=5)

    assert "customers" in result
    if result["customers"]:
        customer = result["customers"][0]
        for field in ("customer_name", "total_spent", "visit_count", "loyalty_points", "last_purchase_date"):
            assert field in customer, f"Campo faltante: {field}"


async def test_customer_stats_limit_respected(db_session: AsyncSession, test_user) -> None:
    """El parámetro limit acota la cantidad de clientes devueltos."""
    for _ in range(5):
        await create_customer(db_session)

    executor = ToolExecutor(db_session)
    result = await executor.get_customer_stats(limit=3)

    assert len(result["customers"]) <= 3


# ── execute() dispatcher ──────────────────────────────────────────────────────

async def test_execute_unknown_tool_returns_error(
    db_session: AsyncSession, test_user
) -> None:
    """Tool desconocida devuelve {"error": ...} sin lanzar excepción."""
    executor = ToolExecutor(db_session)
    result = await executor.execute("herramienta_inexistente", {})

    assert "error" in result


async def test_execute_dispatches_to_correct_handler(
    db_session: AsyncSession, test_user
) -> None:
    """execute() llama al handler correcto según el nombre de la tool."""
    today = date.today()

    executor = ToolExecutor(db_session)
    result = await executor.execute(
        "get_sales_summary",
        {"from_date": today.isoformat(), "to_date": today.isoformat()},
    )

    assert "sale_count" in result
    assert "total_revenue" in result
    assert "error" not in result
