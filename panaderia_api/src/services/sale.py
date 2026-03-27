from datetime import datetime, timezone
from decimal import Decimal
from math import floor
from uuid import UUID

from src.core.config import settings
from src.core.exceptions import InsufficientStockError, NotFoundException, ValidationError
from src.core.logging import get_logger
from src.models.enums import SaleStatus
from src.models.sale import Sale
from src.repositories.customer import CustomerRepository
from src.repositories.product import ProductRepository
from src.repositories.sale import SaleRepository
from src.repositories.sale_item import SaleItemRepository
from src.schemas.sale import SaleCancel, SaleCreate, SaleWithItemsResponse
from src.schemas.sale_item import SaleItemCreate

# configurable via LOYALTY_POINTS_RATIO en archivo de entorno
def _loyalty_ratio() -> Decimal:
    return Decimal(str(settings.LOYALTY_POINTS_RATIO))

logger = get_logger(__name__)

# servicio de gestion de ventas
class SaleService:
    def __init__(
        self,
        sale_repo: SaleRepository,
        sale_item_repo: SaleItemRepository,
        product_repo: ProductRepository,
        customer_repo: CustomerRepository) -> None:

        self.sale_repo = sale_repo
        self.sale_item_repo = sale_item_repo
        self.product_repo = product_repo
        self.customer_repo = customer_repo

    # obtener todas las ventas con paginación y filtros opcionales por fecha
    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        from_date=None,
        to_date=None,
    ) -> list[Sale]:
        return await self.sale_repo.get_all(skip=skip, limit=limit, from_date=from_date, to_date=to_date)

    # contar el total de ventas registradas, con filtros opcionales por fecha
    async def count_all(self, from_date=None, to_date=None) -> int:
        return await self.sale_repo.count_all(from_date=from_date, to_date=to_date)

    # obtener una venta por su id, lanza error si no existe
    async def get_by_id(self, id: UUID) -> Sale:
        sale = await self.sale_repo.get_by_id_with_items(id)
        if not sale:
            raise NotFoundException("Venta no encontrada")
        return sale

    # crear una nueva venta
    async def create_sale(self, data: SaleCreate, user_id: UUID) -> Sale:
        # Validar stock SIN lock (fail fast, antes de abrir la transacción crítica)
        item_data = await self._resolve_items(data.items)

        # Obtener locks pesimistas en productos (SELECT FOR UPDATE)
        locked_products = {}
        for item in data.items:
            product = await self.product_repo.get_by_id_with_lock(item.product_id)
            if not product or not product.is_active:
                raise NotFoundException(f"Producto {item.product_id} no encontrado o inactivo")
            if product.stock_quantity < item.quantity:
                raise InsufficientStockError(
                    f"Stock insuficiente para '{product.name}': "
                    f"disponible {product.stock_quantity}, requerido {item.quantity}"
                )
            locked_products[item.product_id] = product

        # Calcular totales
        subtotal = sum(d["subtotal"] for d in item_data)
        discount = data.discount_amount
        tax_amount = Decimal("0.00")  # impuesto configurable en Sprint 8
        total_amount = subtotal - discount

        # Generar número de venta
        year = datetime.now(timezone.utc).year
        sale_number = await self.sale_repo.get_next_sale_number(year)

        # Crear cabecera de la venta
        sale = await self.sale_repo.create(
            user_id=user_id,
            sale_number=sale_number,
            subtotal=subtotal,
            discount_amount=discount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            payment_method=data.payment_method,
            customer_id=data.customer_id,
            notes=data.notes,
        )

        # Crear items de la venta con precio histórico
        for item_dict in item_data:
            item_dict["sale_id"] = sale.id
        await self.sale_item_repo.create_bulk(sale.id, item_data)

        # Decrementar stock
        for item in data.items:
            product = locked_products[item.product_id]
            product.stock_quantity -= item.quantity
            await self.sale_repo.session.flush()

        # Acumular puntos si hay cliente
        if data.customer_id:
            points_earned = int(floor(total_amount / _loyalty_ratio()))
            if points_earned > 0:
                customer = await self.customer_repo.get_by_id(data.customer_id)
                if customer and customer.is_active:
                    await self.customer_repo.update_loyalty_points(
                        customer, customer.loyalty_points + points_earned
                    )

        # commit atómico
        await self.sale_repo.session.commit()

        logger.info(
            f"Venta creada: {sale_number}",
            extra={"sale_id": str(sale.id), "total": str(total_amount)},
        )

        # recargar con items para la respuesta
        return await self.get_by_id(sale.id)

    # cancelar una venta
    async def cancel_sale(self, id: UUID, data: SaleCancel) -> Sale:
        sale = await self.get_by_id(id)

        # solo se puede cancelar una venta que no esté ya cancelada
        if sale.status == SaleStatus.CANCELADA:
            raise ValidationError("La venta ya está cancelada")

        # solo se puede cancelar una venta el mismo día
        sale_date_utc = sale.sale_date.date() if sale.sale_date.tzinfo else sale.sale_date.date()
        today_utc = datetime.now(timezone.utc).date()
        if sale_date_utc != today_utc:
            raise ValidationError("Solo se puede cancelar una venta el mismo día de su registro")

        # Revertir stock para cada item
        for item in sale.items:
            product = await self.product_repo.get_by_id_with_lock(item.product_id)
            if product:
                product.stock_quantity += item.quantity
                await self.sale_repo.session.flush()

        # Revertir puntos de fidelidad
        if sale.customer_id:
            points_earned = int(floor(sale.total_amount / _loyalty_ratio()))
            if points_earned > 0:
                customer = await self.customer_repo.get_by_id(sale.customer_id)
                if customer:
                    new_points = max(0, customer.loyalty_points - points_earned)
                    await self.customer_repo.update_loyalty_points(customer, new_points)

        # Actualizar estado de la venta a cancelada
        await self.sale_repo.cancel(sale, notes=data.notes)
        await self.sale_repo.session.commit()

        logger.info(
            f"Venta cancelada: {sale.sale_number}",
            extra={"sale_id": str(sale.id)},
        )

        return await self.get_by_id(id)

    # helper para resolver productos, validar stock y calcular subtotales antes de adquirir locks
    async def _resolve_items(self, items: list[SaleItemCreate]) -> list[dict]:
        resolved = []
        for item in items:
            product = await self.product_repo.get_by_id(item.product_id)
            if not product or not product.is_active:
                raise NotFoundException(f"Producto {item.product_id} no encontrado o inactivo")
            if product.stock_quantity < item.quantity:
                raise InsufficientStockError(
                    f"Stock insuficiente para '{product.name}': "
                    f"disponible {product.stock_quantity}, requerido {item.quantity}"
                )
            subtotal = (item.quantity * product.price).quantize(Decimal("0.01"))
            resolved.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "unit": product.unit.value,
                "unit_price": product.price,
                "subtotal": subtotal,
            })
        return resolved
