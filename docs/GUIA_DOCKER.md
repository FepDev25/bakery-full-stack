# Guía Docker - Panadería SaaS

## 1. Configuración Inicial

Crear archivo `docker-compose.yml` en la raíz del proyecto:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: panaderia_db
    restart: unless-stopped
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: panaderia_user
      POSTGRES_PASSWORD: panaderia_pass
      POSTGRES_DB: panaderia_db
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./panaderia_db/database/00_init.sql:/docker-entrypoint-initdb.d/00_init.sql:ro
      - ./panaderia_db/database/01_schema.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro
      # no se monta 02_triggers.sql ya que la lógica va en código
      # - ./panaderia_db/database/seeds.sql:/docker-entrypoint-initdb.d/03_seeds.sql:ro 
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U panaderia_user -d panaderia_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local

```

## 2. Archivo .env

Crear `.env` en la raíz:

```env
# Database
DATABASE_URL=postgresql://panaderia_user:panaderia_pass@localhost:5433/panaderia_db

# Auth (generar con: openssl rand -hex 32)
SECRET_KEY=tu_secret_key_aqui
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Business Rules
LOYALTY_POINTS_RATIO=10
LOYALTY_REDEEM_RATIO=10
```

## 3. Comandos Básicos

**Levantar la base de datos:**
```bash
docker compose up -d
```

**Ver logs:**
```bash
docker compose logs -f postgres
```

**Detener:**
```bash
docker compose down
```

**Detener y eliminar volúmenes (BORRA DATOS):**
```bash
docker compose down -v
```

**Reiniciar:**
```bash
docker compose restart postgres
```

**Ejecutar SQL directamente:**
```bash
docker compose exec postgres psql -U panaderia_user -d panaderia_db
```

## 4. Inicialización del Schema

Los archivos en `./panaderia_db/database/` se ejecutarán automáticamente al crear el contenedor por primera vez (en orden alfabético):

- `00_init.sql` - Extensiones (uuid-ossp)
- `01_schema.sql` - Tablas y constraints
- `seeds.sql` - Datos de prueba (opcional)

**IMPORTANTE:** NO incluir `02_triggers.sql` ya que la lógica va en código.

## 5. Verificar Conexión

Desde Python (con psycopg2 o SQLAlchemy):

```python
from sqlalchemy import create_engine

engine = create_engine("postgresql://panaderia_user:panaderia_pass@localhost:5433/panaderia_db")
with engine.connect() as conn:
    result = conn.execute("SELECT version();")
    print(result.fetchone())
```

## 6. Troubleshooting

**Puerto ocupado:**
Cambiar `5433:5432` a otro puerto en `docker-compose.yml`

**Permisos en volumen:**
```bash
sudo chown -R $USER:$USER postgres_data/
```

**Resetear base de datos:**
```bash
docker compose down -v
docker compose up -d
```

**Ver tablas creadas:**
```bash
docker compose exec postgres psql -U panaderia_user -d panaderia_db -c "\dt"
```
