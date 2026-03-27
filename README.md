# Panadería SaaS — Backend API

Sistema de gestión para panadería: ventas en punto de venta, control de inventario, ciclo de producción y seguimiento de gastos. Construido como una API REST asíncrona sobre FastAPI y PostgreSQL.

---

## Arquitectura

La aplicación sigue una arquitectura de capas estricta. Cada capa tiene una responsabilidad única y solo puede comunicarse con la capa inmediatamente inferior.

```mermaid
flowchart TD
    Client(["Cliente HTTP\n(navegador / app móvil)"])

    subgraph API["FastAPI Application"]
        direction TB
        MW["Middlewares\n(CORS · logging · error handler)"]
        Auth["Autenticación JWT\ndependencies.py"]
        Routes["Route Handlers\n11 módulos"]
        Services["Services — Lógica de Negocio\n(reglas de negocio RN-001 … RN-010)"]
        Repos["Repositories — Acceso a Datos\nBaseRepository[T] + 11 especializados"]
    end

    DB[("PostgreSQL 16\n12 tablas · UUID · soft delete")]

    Client -->|"Bearer JWT"| MW
    MW --> Auth
    Auth --> Routes
    Routes --> Services
    Services --> Repos
    Repos -->|"SQLAlchemy 2.0 async\nasyncpg"| DB
```

**Decisiones de diseño que condicionan toda la arquitectura:**

- **Lógica en la aplicación, no en triggers.** Las reglas de negocio viven en la capa de servicio, son testeables en aislamiento y no dependen de comportamiento implícito de la base de datos.
- **Async de punta a punta.** SQLAlchemy 2.0 asyncio + asyncpg. No hay bloqueo de I/O en ningún punto del stack.
- **Repositorios no hacen commit.** La transacción es propiedad exclusiva del servicio, lo que garantiza atomicidad en operaciones que tocan múltiples tablas.
- **Locks pesimistas para inventario.** Las operaciones que modifican stock usan `SELECT FOR UPDATE` para evitar condiciones de carrera bajo carga concurrente.

---

## Módulos del dominio

```mermaid
flowchart LR
    subgraph Catálogo
        Category --> Product
        Supplier
        Ingredient
    end

    subgraph Ventas
        Customer --> Sale
        Sale --> SaleItem
        SaleItem --> Product
    end

    subgraph Producción
        ProductionBatch --> Product
        ProductionBatch --> Recipe
        Recipe --> Ingredient
    end

    subgraph Compras
        IngredientPurchase --> Ingredient
        IngredientPurchase --> Supplier
    end

    subgraph Gastos
        Expense --> User
    end

    subgraph Usuarios
        User
    end
```

| Módulo | Endpoint base | Roles con acceso | Responsabilidad principal |
|---|---|---|---|
| Auth | `/auth` | público | Login, refresh de tokens JWT |
| Users | `/users` | admin | Gestión de cuentas del sistema |
| Categories | `/categories` | todos | Clasificación de productos |
| Products | `/products` | todos / admin-cajero | CRUD + protección de stock activo |
| Customers | `/customers` | admin, cajero | Clientes y puntos de fidelidad |
| Suppliers | `/suppliers` | admin, contador | Proveedores de ingredientes |
| Ingredients | `/ingredients` | todos / admin-contador | Inventario de materias primas |
| Sales | `/sales` | cajero, admin | Punto de venta, cancelaciones |
| Production | `/production-batches` | panadero, admin | Lotes de producción |
| Purchases | `/ingredient-purchases` | admin, contador | Compras de ingredientes |
| Recipes | `/recipes` | panadero, admin, contador | Formulaciones de productos |
| Expenses | `/expenses` | admin, contador | Registro de gastos operativos |

### Reglas de negocio implementadas

| ID | Regla | Servicio |
|---|---|---|
| RN-001 | Venta decrementa stock con lock pesimista | `SaleService.create_sale` |
| RN-002 | Producción consume ingredientes × receta × cantidad | `ProductionService.complete_batch` |
| RN-003 | Costo promedio ponderado en compras de ingredientes | `PurchaseService.register_purchase` |
| RN-004 | Precio histórico guardado en cada ítem de venta | `SaleService.create_sale` |
| RN-005 | No se puede desactivar un producto con stock o ventas activas | `ProductService.deactivate` |
| RN-006 | Cancelación de venta solo en el mismo día, revierte stock y puntos | `SaleService.cancel_sale` |
| RN-007 | Acumulación de puntos de fidelidad: 1 punto por cada N pesos (configurable) | `SaleService.create_sale` |
| RN-008 | Lote descartado (merma) consume ingredientes pero no suma al stock | `ProductionService.discard_batch` |
| RN-009 | Redención de puntos genera descuento, valida saldo disponible | `CustomerService.redeem_points` |
| RN-010 | Número de venta secuencial con formato `VTA-YYYY-NNNNN` | `SaleService.create_sale` |

---

## Quick start (Docker)

Requisitos: Docker 24+ con el plugin Compose.

```bash
# 1. Clonar y entrar al repositorio
git clone <repo-url>
cd panaderia

# 2. Crear el archivo de entorno
cp .env.example .env
# Editar .env: cambiar SECRET_KEY y POSTGRES_PASSWORD

# 3. Levantar la base de datos y la API
docker compose up -d

# 4. Verificar que todo está en pie
curl http://localhost:8000/health
# {"status":"ok","version":"panaderia_api"}
```

La base de datos se inicializa automáticamente con el schema al primer arranque del contenedor PostgreSQL.

Para acceder a pgAdmin (interfaz gráfica de la BD):

```bash
docker compose --profile tools up -d pgadmin
# Abrir http://localhost:5050
# Usuario: admin@panaderia.local  |  Contraseña: admin
# Host del servidor: postgres  |  Puerto: 5432
```

---

## Variables de entorno

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PROJECT_NAME` | Nombre expuesto en la documentación de la API | `panaderia_api` |
| `API_V1_STR` | Prefijo de todas las rutas | `/api/v1` |
| `POSTGRES_SERVER` | Host del servidor PostgreSQL | `localhost` |
| `POSTGRES_PORT` | Puerto del servidor PostgreSQL | `5433` |
| `POSTGRES_USER` | Usuario de la BD | — |
| `POSTGRES_PASSWORD` | Contraseña de la BD | — |
| `POSTGRES_DB` | Nombre de la base de datos | `panaderia_db` |
| `SECRET_KEY` | Clave de firma de tokens JWT (mínimo 256 bits) | — |
| `JWT_ALGORITHM` | Algoritmo de firma | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Vida útil del access token en minutos | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Vida útil del refresh token en días | `7` |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos, separados por coma | `http://localhost:3000,...` |
| `LOG_LEVEL` | Nivel de logging (`DEBUG`, `INFO`, `WARNING`, `ERROR`) | `INFO` |
| `LOYALTY_POINTS_RATIO` | Pesos necesarios para acumular 1 punto de fidelidad | `10` |

> En Docker Compose, `POSTGRES_SERVER` y `POSTGRES_PORT` son sobreescritos automáticamente a `postgres` y `5432` para que la API alcance la BD dentro de la red interna.

---

## Desarrollo local

Requisitos: Python 3.12, [uv](https://docs.astral.sh/uv/), PostgreSQL 16 (o el contenedor de solo la BD).

```bash
# Levantar solo la base de datos
docker compose up -d postgres

# Instalar dependencias (incluye herramientas de desarrollo)
cd panaderia_api
uv sync

# Crear .env apuntando a localhost
cp ../.env.example .env
# Ajustar POSTGRES_PORT=5433 y las credenciales

# Iniciar el servidor con recarga automática
uv run uvicorn main:app --reload
```

La documentación interactiva de la API queda disponible en:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Agregar dependencias

```bash
cd panaderia_api
uv add <paquete>          # dependencia de producción
uv add --dev <paquete>    # dependencia de desarrollo
```

---

## Tests

El proyecto tiene tres niveles de testing:

| Suite | Ubicación | Descripción | Requiere BD |
|---|---|---|---|
| Unitarios | `tests/unit/` | Servicios en aislamiento con mocks de repositorios | No |
| API (mocked) | `tests/api/` | Endpoints HTTP con servicios mockeados | No |
| Integración | `tests/integration/` | Flujos completos contra PostgreSQL real | Sí |

```bash
# Todos los tests
uv run pytest

# Solo unitarios y API (sin BD)
uv run pytest tests/unit/ tests/api/

# Solo integración (requiere PostgreSQL corriendo)
uv run pytest tests/integration/

# Con salida detallada
uv run pytest -v
```

Los tests de integración usan una base de datos separada (`panaderia_test`). Crearla una vez:

```bash
docker compose up -d postgres
PGPASSWORD=panaderia_pass psql -h localhost -p 5433 -U panaderia_user -d panaderia_db \
  -c "CREATE DATABASE panaderia_test OWNER panaderia_user;"
```

La variable `TEST_DATABASE_URL` puede sobreescribir la BD de integración:

```bash
TEST_DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/test_db uv run pytest tests/integration/
```

---

## Estructura del proyecto

```
panaderia/
├── docker-compose.yml          # Orquestación: api + postgres (+ pgadmin opcional)
├── .env.example                # Plantilla de variables de entorno
├── panaderia_api/
│   ├── Dockerfile              # Multi-stage build con uv
│   ├── pyproject.toml          # Dependencias y configuración de pytest
│   ├── main.py                 # Punto de entrada: middlewares, routers, handlers
│   └── src/
│       ├── api/v1/
│       │   ├── router.py       # Registro de rutas con dependencias de autenticación
│       │   └── routes/         # 11 módulos de endpoints
│       ├── core/
│       │   ├── config.py       # Settings cargados desde .env (pydantic-settings)
│       │   ├── database.py     # Engine async + sessionmaker
│       │   ├── dependencies.py # get_current_user, require_role
│       │   ├── exceptions.py   # Jerarquía de excepciones de dominio
│       │   ├── logging.py      # Logging JSON estructurado
│       │   └── security.py     # bcrypt + JWT
│       ├── middleware/
│       │   ├── error_handler.py
│       │   └── logging.py      # Correlation ID por request
│       ├── models/             # 12 modelos ORM SQLAlchemy (+ enums, mixins)
│       ├── repositories/       # BaseRepository[T] + 11 especializados
│       ├── schemas/            # Pydantic v2: Create / Update / Response por entidad
│       ├── services/           # Lógica de negocio: reglas RN-001 a RN-010
│       └── utils/
│           └── pagination.py   # PaginatedResponse[T] + PaginationParams
└── panaderia_db/
    └── database/
        ├── 00_init.sql         # Extensiones PostgreSQL (uuid-ossp, pgcrypto, unaccent)
        └── 01_schema.sql       # DDL completo: 12 tablas, constraints, índices
```
