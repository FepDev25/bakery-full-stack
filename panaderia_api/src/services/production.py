from decimal import Decimal
from uuid import UUID

from src.core.exceptions import InsufficientStockError, NotFoundException, ValidationError
from src.core.logging import get_logger
from src.models.enums import ProductionBatchStatus
from src.models.production_batch import ProductionBatch
from src.repositories.ingredient import IngredientRepository
from src.repositories.production_batch import ProductionBatchRepository
from src.repositories.product import ProductRepository
from src.repositories.recipe import RecipeRepository
from src.schemas.production_batch import ProductionBatchCreate

logger = get_logger(__name__)

# servicio para gestionar lotes de producción
class ProductionService:
    def __init__(
        self,
        batch_repo: ProductionBatchRepository,
        product_repo: ProductRepository,
        ingredient_repo: IngredientRepository,
        recipe_repo: RecipeRepository,) -> None:

        self.batch_repo = batch_repo
        self.product_repo = product_repo
        self.ingredient_repo = ingredient_repo
        self.recipe_repo = recipe_repo

    # obtener todos los lotes de producción con paginación
    async def get_all(self, skip: int = 0, limit: int = 100) -> list[ProductionBatch]:
        return await self.batch_repo.get_all(skip=skip, limit=limit)

    # contar el total de lotes de producción registrados
    async def count_all(self) -> int:
        return await self.batch_repo.count_all()

    # obtener un lote de producción por su id, lanza error si no existe
    async def get_by_id(self, id: UUID) -> ProductionBatch:
        batch = await self.batch_repo.get_by_id(id)
        if not batch:
            raise NotFoundException("Lote de producción no encontrado")
        return batch

    # crear un nuevo lote de producción
    async def create_batch(self, data: ProductionBatchCreate, user_id: UUID) -> ProductionBatch:
        product = await self.product_repo.get_by_id(data.product_id)
        # valida que el producto exista
        if not product or not product.is_active:
            raise NotFoundException("Producto no encontrado o inactivo")
        
        recipes = await self.recipe_repo.get_by_product(data.product_id)
        # valida que el producto tenga receta definida, requisito para registrar producción 
        if not recipes:
            raise ValidationError(
                f"El producto '{product.name}' no tiene receta definida. "
                "No se puede registrar producción sin receta."
            )
        
        batch = await self.batch_repo.create(data, user_id=user_id)
        await self.batch_repo.session.commit()
        return batch

    # completar un lote de producción, consumiendo ingredientes y actualizando stock del producto
    async def complete_batch(self, id: UUID) -> ProductionBatch:

        # obtener y validar lote
        batch = await self.get_by_id(id)
        if batch.status != ProductionBatchStatus.EN_PROCESO:
            raise ValidationError(
                f"No se puede completar un lote con estado '{batch.status.value}'"
            )

        # obtener receta con ingredientes (JOIN) para evitar N+1 queries
        recipes = await self.recipe_repo.get_by_product_with_ingredients(batch.product_id)
        if not recipes:
            raise ValidationError("El producto no tiene receta definida")

        # Validar stock (fail fast, sin locks)
        await self._validate_ingredient_stock(recipes, batch.quantity_produced)

        # Adquirir locks y decrementar ingredientes
        ingredient_cost = await self._consume_ingredients(recipes, batch.quantity_produced)

        # Incrementar stock del producto
        product = await self.product_repo.get_by_id_with_lock(batch.product_id)
        if not product:
            raise NotFoundException("Producto no encontrado")
        product.stock_quantity += batch.quantity_produced
        await self.batch_repo.session.flush()

        # Actualizar batch
        await self.batch_repo.complete(batch, ingredient_cost)
        await self.batch_repo.session.commit()

        logger.info(
            "Lote completado",
            extra={"batch_id": str(id), "product_id": str(batch.product_id)},
        )
        return await self.get_by_id(id)

    # descartar un lote de producción, consume ingredientes pero no incrementa stock del producto
    async def discard_batch(self, id: UUID) -> ProductionBatch:
        batch = await self.get_by_id(id)
        if batch.status != ProductionBatchStatus.EN_PROCESO:
            raise ValidationError(
                f"No se puede descartar un lote con estado '{batch.status.value}'"
            )

        recipes = await self.recipe_repo.get_by_product_with_ingredients(batch.product_id)
        if not recipes:
            raise ValidationError("El producto no tiene receta definida")

        await self._validate_ingredient_stock(recipes, batch.quantity_produced)

        ingredient_cost = await self._consume_ingredients(recipes, batch.quantity_produced)

        # no incrementar stock del producto
        await self.batch_repo.discard(batch, ingredient_cost)
        await self.batch_repo.session.commit()

        logger.info(
            "Lote descartado (merma)",
            extra={"batch_id": str(id), "product_id": str(batch.product_id)},
        )
        return await self.get_by_id(id)

    # helper privado que valida stock de todos los ingredientes antes de adquirir locks
    async def _validate_ingredient_stock(self, recipes, quantity_produced: Decimal) -> None:
        shortages = []
        for recipe in recipes:
            required = recipe.quantity * quantity_produced
            if recipe.ingredient.stock_quantity < required:
                shortages.append(
                    f"'{recipe.ingredient.name}': disponible {recipe.ingredient.stock_quantity}, "
                    f"requerido {required}"
                )
        if shortages:
            raise InsufficientStockError(
                "Ingredientes insuficientes para completar el lote: " + "; ".join(shortages)
            )

    # helper privado que adquiere locks y decrementa ingredientes, retorna costo total calculado
    async def _consume_ingredients(self, recipes, quantity_produced: Decimal) -> Decimal:

        total_cost = Decimal("0.00")
        for recipe in recipes:
            required = recipe.quantity * quantity_produced
            ingredient = await self.ingredient_repo.get_by_id_with_lock(recipe.ingredient_id)

            if not ingredient:
                raise NotFoundException(f"Ingrediente {recipe.ingredient_id} no encontrado")

            ingredient.stock_quantity -= required
            cost = (required * ingredient.unit_cost).quantize(Decimal("0.01"))
            total_cost += cost
            await self.batch_repo.session.flush()
        return total_cost
