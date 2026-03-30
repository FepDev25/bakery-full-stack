"""
Fixtures para tests de integración.

Estrategia de aislamiento:
  - Cada test corre dentro de una transacción PostgreSQL que se hace rollback al finalizar.
  - `join_transaction_mode="create_savepoint"` permite que los servicios llamen a
    session.commit() sin comprometer la transacción externa del test.
  - `get_async_db` se sobreescribe para que FastAPI use la sesión del test.
  - `get_current_user` se sobreescribe (via test_user) para que el user_id exista en la BD de test.

Requisito: la variable TEST_DATABASE_URL debe apuntar a una BD PostgreSQL de test.
  export TEST_DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/panaderia_test
"""

import os
import uuid
from datetime import date
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

import src.models  # noqa — registra todos los modelos en Base.metadata
from main import app
from src.core.database import Base, get_async_db
from src.core.dependencies import get_current_user
from src.core.security import hash_password
from src.models.category import Category
from src.models.customer import Customer
from src.models.enums import IngredientUnit, ProductUnit, Role
from src.models.ingredient import Ingredient
from src.models.product import Product
from src.models.recipe import Recipe
from src.models.user import User

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://panaderia_user:panaderia_pass@localhost:5433/panaderia_test",
)


# ── Fixtures principales ──────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def db_session():
    """
    Sesión de BD con rollback automático al final de cada test.

    Se crea un engine fresco por test para evitar que las conexiones asyncpg
    queden ligadas al event loop del test anterior (cada test corre en su propio loop
    cuando asyncio_default_test_loop_scope=function).

    create_all es idempotente (checkfirst=True): crea las tablas la primera vez
    y las omite en ejecuciones posteriores.
    """
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        async with engine.connect() as conn:
            await conn.begin()
            session = AsyncSession(
                bind=conn,
                expire_on_commit=False,
                join_transaction_mode="create_savepoint",
            )

            async def _override():
                yield session

            app.dependency_overrides[get_async_db] = _override
            try:
                yield session
            finally:
                app.dependency_overrides.pop(get_async_db, None)
                await session.close()
                await conn.rollback()
    finally:
        await engine.dispose()


@pytest_asyncio.fixture
async def test_user(db_session):
    """
    Crea un usuario admin en la BD de test y sobreescribe get_current_user
    para que el user_id referenciado en ventas/lotes exista realmente en la BD.
    """
    user = await _create_user(db_session, role=Role.ADMIN)
    app.dependency_overrides[get_current_user] = lambda: user
    yield user
    app.dependency_overrides.pop(get_current_user, None)


@pytest_asyncio.fixture
async def http_client():
    """Cliente HTTP asíncrono que usa el ASGI transport (sin red real)."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client


# ── Factories ─────────────────────────────────────────────────────────────────


async def _create_user(
    session: AsyncSession, role: Role = Role.ADMIN, email: str | None = None
) -> User:
    user = User(
        email=email or f"user_{uuid.uuid4().hex[:8]}@test.com",
        password_hash=hash_password("test_pass_123"),
        full_name="Test User",
        role=role,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    return user


async def create_category(session: AsyncSession, name: str | None = None) -> Category:
    cat = Category(name=name or f"cat_{uuid.uuid4().hex[:8]}")
    session.add(cat)
    await session.flush()
    return cat


async def create_product(
    session: AsyncSession,
    category_id: uuid.UUID,
    stock: Decimal = Decimal("10.000"),
    price: Decimal = Decimal("1000.00"),
    name: str | None = None,
) -> Product:
    prod = Product(
        category_id=category_id,
        name=name or f"prod_{uuid.uuid4().hex[:8]}",
        price=price,
        unit=ProductUnit.UNIDAD,
        stock_quantity=stock,
        is_active=True,
    )
    session.add(prod)
    await session.flush()
    return prod


async def create_ingredient(
    session: AsyncSession,
    stock: Decimal = Decimal("20.000"),
    unit_cost: Decimal = Decimal("500.00"),
    name: str | None = None,
) -> Ingredient:
    ing = Ingredient(
        name=name or f"ing_{uuid.uuid4().hex[:8]}",
        unit=IngredientUnit.KG,
        stock_quantity=stock,
        unit_cost=unit_cost,
        is_active=True,
    )
    session.add(ing)
    await session.flush()
    return ing


async def create_recipe(
    session: AsyncSession,
    product_id: uuid.UUID,
    ingredient_id: uuid.UUID,
    quantity: Decimal = Decimal("2.000"),
) -> Recipe:
    recipe = Recipe(
        product_id=product_id,
        ingredient_id=ingredient_id,
        quantity=quantity,
        unit=IngredientUnit.KG,
    )
    session.add(recipe)
    await session.flush()
    return recipe


async def create_customer(session: AsyncSession, name: str | None = None) -> Customer:
    c = Customer(
        name=name or f"Cliente {uuid.uuid4().hex[:8]}",
        phone=f"099{uuid.uuid4().hex[:7]}",
        loyalty_points=0,
        is_active=True,
    )
    session.add(c)
    await session.flush()
    return c
