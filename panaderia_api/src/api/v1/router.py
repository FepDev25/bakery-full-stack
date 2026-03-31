from fastapi import APIRouter, Depends

from src.api.v1.routes.ai import router as ai_router
from src.api.v1.routes.auth import router as auth_router
from src.api.v1.routes.category import router as categories_router
from src.api.v1.routes.customer import router as customers_router
from src.api.v1.routes.expense import router as expenses_router
from src.api.v1.routes.ingredient import router as ingredients_router
from src.api.v1.routes.ingredient_purchase import router as purchases_router
from src.api.v1.routes.product import router as products_router
from src.api.v1.routes.production_batch import router as production_router
from src.api.v1.routes.recipe import router as recipes_router
from src.api.v1.routes.sale import router as sales_router
from src.api.v1.routes.supplier import router as suppliers_router
from src.api.v1.routes.user import router as users_router
from src.core.dependencies import get_current_user

router = APIRouter()

# rutas públicas
router.include_router(auth_router, prefix="/auth", tags=["Auth"])

# rutas protegidas, autenticación mínima garantizada a nivel de router.
# el control de roles granular está en cada endpoint / sub-router.
_auth = [Depends(get_current_user)]
router.include_router(categories_router, prefix="/categories", tags=["Categories"], dependencies=_auth)
router.include_router(suppliers_router, prefix="/suppliers", tags=["Suppliers"], dependencies=_auth)
router.include_router(ingredients_router, prefix="/ingredients", tags=["Ingredients"], dependencies=_auth)
router.include_router(products_router, prefix="/products", tags=["Products"], dependencies=_auth)
router.include_router(customers_router, prefix="/customers", tags=["Customers"], dependencies=_auth)
router.include_router(users_router, prefix="/users", tags=["Users"], dependencies=_auth)
router.include_router(sales_router, prefix="/sales", tags=["Sales"], dependencies=_auth)
router.include_router(production_router, prefix="/production-batches", tags=["Production"], dependencies=_auth)
router.include_router(purchases_router, prefix="/ingredient-purchases", tags=["Purchases"], dependencies=_auth)
router.include_router(recipes_router, prefix="/recipes", tags=["Recipes"], dependencies=_auth)
router.include_router(expenses_router, prefix="/expenses", tags=["Expenses"], dependencies=_auth)
router.include_router(ai_router, prefix="/ai", tags=["AI Assistant"], dependencies=_auth)
