from decimal import Decimal
from uuid import UUID

from src.core.exceptions import DeleteConstraintError, DuplicateEntityError, NotFoundException
from src.core.logging import get_logger
from src.models.recipe import Recipe
from src.repositories.ingredient import IngredientRepository
from src.repositories.product import ProductRepository
from src.repositories.recipe import RecipeRepository
from src.schemas.recipe import ProductionCostResponse, RecipeCreate, RecipeUpdate

logger = get_logger(__name__)

# servicio para gestionar recetas de productos
class RecipeService:
    def __init__(
        self,
        recipe_repo: RecipeRepository,
        product_repo: ProductRepository,
        ingredient_repo: IngredientRepository) -> None:
        self.recipe_repo = recipe_repo
        self.product_repo = product_repo
        self.ingredient_repo = ingredient_repo

    # obtener recetas por producto, con paginación
    async def get_by_product(self, product_id: UUID) -> list[Recipe]:
        product = await self.product_repo.get_by_id(product_id)
        if not product or not product.is_active:
            raise NotFoundException("Producto no encontrado o inactivo")
        return await self.recipe_repo.get_by_product(product_id)

    # obtener receta por id, lanza error si no existe
    async def get_by_id(self, id: UUID) -> Recipe:
        recipe = await self.recipe_repo.get_by_id(id)
        if not recipe:
            raise NotFoundException("Receta no encontrada")
        return recipe


    # calcular costo de producción por unidad del producto sumando quantity y unit_cost de cada ingrediente en la receta
    async def get_unit_production_cost(self, product_id: UUID) -> ProductionCostResponse:
 
        product = await self.product_repo.get_by_id(product_id)
        if not product or not product.is_active:
            raise NotFoundException("Producto no encontrado o inactivo")

        recipes = await self.recipe_repo.get_by_product_with_ingredients(product_id)
        cost = sum(
            (r.quantity * r.ingredient.unit_cost for r in recipes),
            Decimal("0.00"),
        ).quantize(Decimal("0.01"))

        return ProductionCostResponse(
            product_id=product_id,
            cost_per_unit=cost,
            recipe_count=len(recipes),
        )

    # crear una nueva receta, valida que el producto e ingrediente existan y estén activos, y que no haya duplicados
    async def create(self, data: RecipeCreate) -> Recipe:
        product = await self.product_repo.get_by_id(data.product_id)
        if not product or not product.is_active:
            raise NotFoundException("Producto no encontrado o inactivo")

        ingredient = await self.ingredient_repo.get_by_id(data.ingredient_id)
        if not ingredient or not ingredient.is_active:
            raise NotFoundException("Ingrediente no encontrado o inactivo")

        # Valida que no exista una receta para el mismo producto e ingrediente
        existing = await self.recipe_repo.get_by_product_and_ingredient(
            data.product_id, data.ingredient_id
        )
        if existing:
            raise DuplicateEntityError(
                f"El ingrediente '{ingredient.name}' ya está en la receta de '{product.name}'"
            )

        # Crea la receta y guarda en la base de datos
        recipe = await self.recipe_repo.create(data)
        await self.recipe_repo.session.commit()

        # Loguea la creación de la receta con detalles relevantes para auditoría
        logger.info(
            "Ingrediente agregado a receta",
            extra={"recipe_id": str(recipe.id), "product_id": str(data.product_id)},
        )
        return recipe

    # actualizar una receta existente
    async def update(self, id: UUID, data: RecipeUpdate) -> Recipe:
        recipe = await self.get_by_id(id)
        updated = await self.recipe_repo.update(recipe, data)
        await self.recipe_repo.session.commit()
        return updated

    # eliminar una receta
    async def delete(self, id: UUID) -> None:
        recipe = await self.get_by_id(id)
        await self.recipe_repo.delete(recipe)
        await self.recipe_repo.session.commit()
        logger.info("Receta eliminada", extra={"recipe_id": str(id)})
