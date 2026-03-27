"""Tests unitarios para SaleService — RN-001, RN-004, RN-006, RN-007."""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.core.exceptions import InsufficientStockError, ValidationError
from src.models.customer import Customer
from src.models.enums import PaymentMethod, ProductUnit, SaleStatus
from src.models.product import Product
from src.schemas.sale import SaleCancel, SaleCreate
from src.schemas.sale_item import SaleItemCreate
from src.services.sale import SaleService


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_product(
    price: str = "1500.00",
    stock: str = "10.000",
    is_active: bool = True,
) -> Product:
    p = Product()
    p.id = uuid.uuid4()
    p.name = "Baguette"
    p.price = Decimal(price)
    p.unit = ProductUnit.UNIDAD
    p.stock_quantity = Decimal(stock)
    p.is_active = is_active
    return p


def make_customer(loyalty_points: int = 0) -> Customer:
    c = Customer()
    c.id = uuid.uuid4()
    c.loyalty_points = loyalty_points
    c.is_active = True
    return c


def make_sale(
    total: str = "3000.00",
    status: SaleStatus = SaleStatus.COMPLETADA,
    days_ago: int = 0,
    customer_id=None,
    items=None,
) -> MagicMock:
    """Usamos MagicMock para evitar problemas con las relaciones SQLAlchemy en instancias transients."""
    s = MagicMock()
    s.id = uuid.uuid4()
    s.sale_number = "VTA-2026-00001"
    s.total_amount = Decimal(total)
    s.status = status
    s.customer_id = customer_id
    s.sale_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
    s.items = items if items is not None else []
    return s


def make_sale_item(product_id, quantity: str = "2.000") -> MagicMock:
    item = MagicMock()
    item.id = uuid.uuid4()
    item.product_id = product_id
    item.quantity = Decimal(quantity)
    item.unit = "unidad"
    item.unit_price = Decimal("1500.00")
    item.subtotal = Decimal("3000.00")
    return item


def build_service(product, *, customer=None, sale=None):
    """Construye el servicio con mocks. Devuelve (service, mocks_dict)."""
    session = AsyncMock()

    sale_repo = AsyncMock()
    sale_repo.session = session
    sale_repo.get_next_sale_number.return_value = "VTA-2026-00001"
    sale_repo.get_by_id_with_items.return_value = sale

    created_sale = sale or make_sale(customer_id=customer.id if customer else None)
    sale_repo.create.return_value = created_sale

    sale_item_repo = AsyncMock()
    sale_item_repo.create_bulk.return_value = []

    product_repo = AsyncMock()
    product_repo.get_by_id.return_value = product
    product_repo.get_by_id_with_lock.return_value = product

    customer_repo = AsyncMock()
    if customer:
        customer_repo.get_by_id.return_value = customer

    service = SaleService(sale_repo, sale_item_repo, product_repo, customer_repo)
    return service, {
        "sale_repo": sale_repo,
        "sale_item_repo": sale_item_repo,
        "product_repo": product_repo,
        "customer_repo": customer_repo,
    }


# ── RN-001: Validación de stock ────────────────────────────────────────────────

async def test_create_sale_insufficient_stock_raises_error() -> None:
    """RN-001: stock 1 pero se piden 5 → InsufficientStockError en fail-fast."""
    product = make_product(stock="1.000")
    service, _ = build_service(product)

    data = SaleCreate(
        payment_method=PaymentMethod.EFECTIVO,
        items=[SaleItemCreate(product_id=product.id, quantity=Decimal("5.000"))],
    )

    with pytest.raises(InsufficientStockError):
        await service.create_sale(data, user_id=uuid.uuid4())


async def test_create_sale_exact_stock_succeeds() -> None:
    """Límite: stock == cantidad pedida → debería pasar la validación."""
    product = make_product(stock="3.000")
    sale = make_sale()
    sale_with_items = make_sale(items=[make_sale_item(product.id, quantity="3.000")])
    service, mocks = build_service(product, sale=sale_with_items)
    mocks["sale_repo"].create.return_value = sale
    mocks["sale_repo"].get_by_id_with_items.return_value = sale_with_items

    data = SaleCreate(
        payment_method=PaymentMethod.EFECTIVO,
        items=[SaleItemCreate(product_id=product.id, quantity=Decimal("3.000"))],
    )

    result = await service.create_sale(data, user_id=uuid.uuid4())
    assert result is not None


# ── RN-004: Precio histórico ───────────────────────────────────────────────────

async def test_create_sale_saves_historical_price() -> None:
    """RN-004: unit_price en el item debe ser el precio del producto al momento de la venta."""
    product = make_product(price="2500.00", stock="10.000")
    sale = make_sale()
    sale_with_items = make_sale(items=[make_sale_item(product.id)])
    service, mocks = build_service(product, sale=sale_with_items)
    mocks["sale_repo"].create.return_value = sale
    mocks["sale_repo"].get_by_id_with_items.return_value = sale_with_items

    data = SaleCreate(
        payment_method=PaymentMethod.EFECTIVO,
        items=[SaleItemCreate(product_id=product.id, quantity=Decimal("1.000"))],
    )

    await service.create_sale(data, user_id=uuid.uuid4())

    # create_bulk recibe (sale_id, items_list)
    create_bulk_call = mocks["sale_item_repo"].create_bulk.call_args
    items_passed = create_bulk_call[0][1]  # segundo arg posicional
    assert items_passed[0]["unit_price"] == Decimal("2500.00")


# ── RN-007: Puntos de fidelidad ────────────────────────────────────────────────

async def test_create_sale_accumulates_loyalty_points() -> None:
    """RN-007: 1 punto por cada $10. total=$3000 → 300 puntos ganados."""
    product = make_product(stock="10.000")
    customer = make_customer(loyalty_points=50)
    sale_returned = make_sale(total="3000.00", customer_id=customer.id)
    sale_with_items = make_sale(total="3000.00", customer_id=customer.id, items=[make_sale_item(product.id)])

    service, mocks = build_service(product, customer=customer, sale=sale_with_items)
    mocks["sale_repo"].create.return_value = sale_returned
    mocks["sale_repo"].get_by_id_with_items.return_value = sale_with_items
    mocks["customer_repo"].get_by_id.return_value = customer

    data = SaleCreate(
        payment_method=PaymentMethod.EFECTIVO,
        customer_id=customer.id,
        items=[SaleItemCreate(product_id=product.id, quantity=Decimal("2.000"))],
    )

    await service.create_sale(data, user_id=uuid.uuid4())

    # total=3000, ratio=10 → 300 puntos, customer tenía 50 → ahora 350
    mocks["customer_repo"].update_loyalty_points.assert_called_once_with(customer, 350)


async def test_create_sale_without_customer_no_loyalty_call() -> None:
    """Sin customer_id no se deben acumular puntos."""
    product = make_product(stock="10.000")
    sale = make_sale()
    sale_with_items = make_sale(items=[make_sale_item(product.id)])
    service, mocks = build_service(product, sale=sale_with_items)
    mocks["sale_repo"].create.return_value = sale
    mocks["sale_repo"].get_by_id_with_items.return_value = sale_with_items

    data = SaleCreate(
        payment_method=PaymentMethod.EFECTIVO,
        items=[SaleItemCreate(product_id=product.id, quantity=Decimal("1.000"))],
    )

    await service.create_sale(data, user_id=uuid.uuid4())

    mocks["customer_repo"].update_loyalty_points.assert_not_called()


# ── RN-006: Cancelación ────────────────────────────────────────────────────────

async def test_cancel_sale_different_day_raises_error() -> None:
    """RN-006: solo se puede cancelar el mismo día."""
    sale = make_sale(days_ago=1, items=[])

    sale_repo = AsyncMock()
    sale_repo.get_by_id_with_items.return_value = sale
    sale_repo.session = AsyncMock()

    service = SaleService(sale_repo, AsyncMock(), AsyncMock(), AsyncMock())

    with pytest.raises(ValidationError, match="mismo día"):
        await service.cancel_sale(sale.id, SaleCancel())


async def test_cancel_already_cancelled_raises_error() -> None:
    sale = make_sale(status=SaleStatus.CANCELADA, items=[])

    sale_repo = AsyncMock()
    sale_repo.get_by_id_with_items.return_value = sale
    sale_repo.session = AsyncMock()

    service = SaleService(sale_repo, AsyncMock(), AsyncMock(), AsyncMock())

    with pytest.raises(ValidationError, match="ya está cancelada"):
        await service.cancel_sale(sale.id, SaleCancel())


async def test_cancel_sale_reverts_stock() -> None:
    """Cancelar una venta llama get_by_id_with_lock para cada item (para revertir stock)."""
    product_id = uuid.uuid4()
    item = make_sale_item(product_id, quantity="3.000")
    sale = make_sale(days_ago=0, items=[item])
    cancelled_sale = make_sale(status=SaleStatus.CANCELADA, items=[item])

    sale_repo = AsyncMock()
    sale_repo.get_by_id_with_items.side_effect = [sale, cancelled_sale]
    sale_repo.session = AsyncMock()

    product_repo = AsyncMock()
    locked_product = MagicMock()
    locked_product.stock_quantity = Decimal("5.000")
    product_repo.get_by_id_with_lock.return_value = locked_product

    service = SaleService(sale_repo, AsyncMock(), product_repo, AsyncMock())
    await service.cancel_sale(sale.id, SaleCancel())

    # Verifica que se intentó adquirir el lock del producto para revertir stock
    product_repo.get_by_id_with_lock.assert_called_once_with(product_id)
