from decimal import Decimal
from uuid import UUID

from src.core.exceptions import NotFoundException, ValidationError
from src.core.logging import get_logger
from src.models.ingredient_purchase import IngredientPurchase
from src.repositories.ingredient import IngredientRepository
from src.repositories.ingredient_purchase import IngredientPurchaseRepository
from src.repositories.supplier import SupplierRepository
from src.schemas.ingredient_purchase import IngredientPurchaseCreate

logger = get_logger(__name__)

# servicio para gestionar compras de ingredientes
class PurchaseService:
    def __init__(
        self,
        purchase_repo: IngredientPurchaseRepository,
        ingredient_repo: IngredientRepository,
        supplier_repo: SupplierRepository,
    ) -> None:
        self.purchase_repo = purchase_repo
        self.ingredient_repo = ingredient_repo
        self.supplier_repo = supplier_repo

    # obtener todas las compras de ingredientes con paginación
    async def get_all(self, skip: int = 0, limit: int = 100) -> list[IngredientPurchase]:
        return await self.purchase_repo.get_all(skip=skip, limit=limit)

    # contar el total de compras de ingredientes registradas
    async def count_all(self) -> int:
        return await self.purchase_repo.count_all()

    # obtener por proveedor o ingrediente, con paginación
    async def get_by_supplier(
        self, supplier_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[IngredientPurchase]:
        return await self.purchase_repo.get_by_supplier(supplier_id, skip=skip, limit=limit)

    async def get_by_ingredient(
        self, ingredient_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[IngredientPurchase]:
        return await self.purchase_repo.get_by_ingredient(ingredient_id, skip=skip, limit=limit)

    # registrar una nueva compra de ingrediente
    async def register_purchase(
        self, data: IngredientPurchaseCreate, user_id: UUID
    ) -> IngredientPurchase:
        # Valida que el proveedor y el ingrediente existan y estén activos
        supplier = await self.supplier_repo.get_by_id(data.supplier_id)
        if not supplier or not supplier.is_active:
            raise NotFoundException("Proveedor no encontrado o inactivo")

        # Valida que el ingrediente exista y esté activo, adquiere
        ingredient = await self.ingredient_repo.get_by_id_with_lock(data.ingredient_id)
        if not ingredient or not ingredient.is_active:
            raise NotFoundException("Ingrediente no encontrado o inactivo")

        # Valida que la cantidad sea mayor a cero
        if data.quantity <= 0:
            raise ValidationError("La cantidad debe ser mayor a cero")

        # Calcula el costo promedio ponderado del ingrediente
        new_cost = self._weighted_average_cost(
            current_stock=ingredient.stock_quantity,
            current_cost=ingredient.unit_cost,
            incoming_quantity=data.quantity,
            incoming_price=data.unit_price,
        )

        # Calcula el nuevo stock del ingrediente
        new_stock = ingredient.stock_quantity + data.quantity
        total_amount = (data.quantity * data.unit_price).quantize(Decimal("0.01"))

        # Actualiza el stock y costo del ingrediente, y registra la compra
        await self.ingredient_repo.update_stock_and_cost(ingredient, new_stock, new_cost)

        purchase = await self.purchase_repo.create(data, user_id=user_id, total_amount=total_amount)
        await self.purchase_repo.session.commit()

        # Loguea el registro de la compra con detalles relevantes para auditoría
        logger.info(
            "Compra de ingrediente registrada",
            extra={
                "purchase_id": str(purchase.id),
                "ingredient_id": str(data.ingredient_id),
                "quantity": str(data.quantity),
                "new_stock": str(new_stock),
                "new_cost": str(new_cost),
            },
        )
        return purchase

    # helper privado para calcular el costo promedio ponderado del ingrediente después de una compra
    @staticmethod
    def _weighted_average_cost(
        current_stock: Decimal,
        current_cost: Decimal,
        incoming_quantity: Decimal,
        incoming_price: Decimal,
    ) -> Decimal:
        if current_stock <= Decimal("0"):
            return incoming_price.quantize(Decimal("0.01"))
        numerator = (current_stock * current_cost) + (incoming_quantity * incoming_price)
        denominator = current_stock + incoming_quantity
        return (numerator / denominator).quantize(Decimal("0.01"))
