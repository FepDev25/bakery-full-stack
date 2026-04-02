# Deploy en Produccion — Panaderia SaaS

**Autor:** Felipe Peralta — Cuenca, Ecuador  
**Demo viva:** https://bakery-pink-delta.vercel.app  
**Stack:** Heroku (backend FastAPI + PostgreSQL) · Vercel (frontend React/Vite)

---

## Indice

1. [Contexto y decision de plataformas](#1-contexto-y-decision-de-plataformas)
2. [Arquitectura final](#2-arquitectura-final)
3. [Preparacion del codigo](#3-preparacion-del-codigo)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Deploy del backend en Heroku](#5-deploy-del-backend-en-heroku)
6. [Base de datos en produccion](#6-base-de-datos-en-produccion)
7. [Deploy del frontend en Vercel](#7-deploy-del-frontend-en-vercel)
8. [CORS](#8-cors)
9. [Proteccion del endpoint AI](#9-proteccion-del-endpoint-ai)
10. [Problemas reales que enfrenté](#10-problemas-reales-que-enfrenté)
11. [Practicas que apliqué y por qué](#11-practicas-que-apliqué-y-por-qué)

---

## 1. Contexto y decision de plataformas

Este es un proyecto de portafolio personal. El objetivo del deploy no era solo tenerlo funcionando, sino hacerlo de una manera que demostrara criterio tecnico: variables de entorno bien gestionadas, secretos fuera del repositorio, CORS configurado correctamente y proteccion sobre el endpoint que consume una API de pago (Anthropic).

Para el backend elegí **Heroku** aprovechando el GitHub Student Developer Pack, que otorga $13 USD en creditos mensuales por dos años — suficiente para mantener un dyno con PostgreSQL activo de forma continua sin costo real.

Para el frontend elegí **Vercel** por su integracion nativa con Vite/React y deploys automaticos desde GitHub. El frontend es un bundle estatico, Vercel lo sirve desde CDN global sin necesidad de servidor propio.

---

## 2. Arquitectura final

```
Usuario (browser)
       │
       ▼
  Vercel CDN
  panaderia_web — build estatico React/Vite
       │  HTTPS + JWT en Authorization header
       ▼
  Heroku Dyno (container stack)
  panaderia_api — FastAPI + uvicorn
       │  asyncpg
       ▼
  Heroku Postgres (essential-0)
  PostgreSQL 16
       │  SQL queries via SQLAlchemy async
       ▼
  Anthropic API
  Claude — consumido exclusivamente desde el backend
```

Una decision de diseño importante: la API key de Anthropic nunca sale del backend. El frontend no sabe que existe. El browser solo habla con `/api/v1/ai/chat` via JWT, y el backend es el unico que llama a Anthropic. Eso mantiene el secreto fuera del bundle publico.

---

## 3. Preparacion del codigo

Antes de hacer el primer push a Heroku fue necesario crear tres archivos y modificar uno existente.

### heroku.yml

Heroku soporta Docker de primera clase mediante `heroku.yml` en la raiz del repositorio. Sin este archivo, Heroku rechaza el push con container stack activo.

```yaml
build:
  docker:
    web: panaderia_api/Dockerfile

run:
  web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

El `$PORT` es critico: Heroku asigna el puerto dinamicamente via variable de entorno. Si el proceso escucha en un puerto fijo, el dyno arranca pero no recibe trafico.

### Dockerfile — soporte de $PORT dinamico

El Dockerfile original tenia el puerto hardcodeado:

```dockerfile
# Antes
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Lo cambié para que use `$PORT` si existe (Heroku) y caiga a `8000` si no (Docker local):

```dockerfile
# Despues
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

### vercel.json

Sin este archivo, navegar directamente a una ruta del SPA (por ejemplo `/app/ventas`) devuelve 404 porque Vercel busca el archivo fisico y no existe. La regla de rewrite redirige todas las rutas a `index.html`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 4. Variables de entorno

Esta fue una de las areas donde quise ser mas cuidadoso que en proyectos universitarios anteriores, donde era comun hardcodear URLs o commitear archivos `.env` con valores reales.

### Principios que apliqué

- El archivo `.env` real nunca entra al repositorio (`.gitignore` lo excluye desde el inicio)
- El repositorio tiene un `.env.example` con todas las variables documentadas pero sin valores sensibles
- Desarrollo y produccion tienen valores separados — en particular `SECRET_KEY` distintas
- Las variables `VITE_*` del frontend son publicas por naturaleza (quedan embebidas en el bundle): solo contienen la URL de la API, nunca secretos

### Variables de backend en Heroku Config Vars

| Variable | Valor en produccion |
|---|---|
| `POSTGRES_SERVER` | extraido de `DATABASE_URL` de Heroku |
| `POSTGRES_PORT` | `5432` |
| `POSTGRES_USER` | extraido de `DATABASE_URL` |
| `POSTGRES_PASSWORD` | extraido de `DATABASE_URL` |
| `POSTGRES_DB` | extraido de `DATABASE_URL` |
| `SECRET_KEY` | generado con `openssl rand -hex 32` |
| `JWT_ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` |
| `ALLOWED_ORIGINS` | `https://bakery-pink-delta.vercel.app` |
| `LOG_LEVEL` | `INFO` |
| `LOYALTY_POINTS_RATIO` | `10` |
| `ANTHROPIC_API_KEY` | key real de produccion |
| `AI_MODEL` | `claude-haiku-4-5-20251001` |
| `AI_MAX_TURNS` | `5` |
| `AI_MAX_TOKENS` | `1024` |

### Heroku provee DATABASE_URL como string unica

El addon de PostgreSQL de Heroku setea automaticamente una variable `DATABASE_URL` con el formato:

```
postgres://usuario:password@host:5432/nombre_db
```

El `config.py` del backend construye la URL de conexion a partir de variables separadas (`POSTGRES_SERVER`, `POSTGRES_PORT`, etc.), no desde una URL unica. Para resolverlo, extraje los componentes con este comando:

```bash
python3 -c "
from urllib.parse import urlparse
import subprocess
url = subprocess.check_output(['heroku', 'config:get', 'DATABASE_URL', '--app', 'panaderia-api']).decode().strip()
u = urlparse(url)
print(f'POSTGRES_USER={u.username}')
print(f'POSTGRES_PASSWORD={u.password}')
print(f'POSTGRES_SERVER={u.hostname}')
print(f'POSTGRES_PORT={u.port}')
print(f'POSTGRES_DB={u.path.lstrip(\"/\")}')
"
```

Y seteé cada variable individualmente con `heroku config:set`.

### Variables de frontend en Vercel

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://panaderia-api-xxxx.herokuapp.com` |
| `VITE_LOYALTY_POINTS_RATIO` | `10` |

---

## 5. Deploy del backend en Heroku

```bash
# Crear la app
heroku create panaderia-api

# Activar container stack (Docker)
heroku stack:set container --app panaderia-api

# Agregar PostgreSQL
heroku addons:create heroku-postgresql:essential-0 --app panaderia-api

# Setear todas las variables (ver seccion 4)
heroku config:set SECRET_KEY=$(openssl rand -hex 32) --app panaderia-api
heroku config:set ANTHROPIC_API_KEY=sk-ant-... --app panaderia-api
# ... resto de variables

# Agregar remote y pushear
heroku git:remote --app panaderia-api
git push heroku main
```

Heroku detecta el `heroku.yml`, construye la imagen Docker y levanta el dyno automaticamente.

---

## 6. Base de datos en produccion

Heroku Postgres no ejecuta ninguna migracion automaticamente. El schema y los datos hay que aplicarlos manualmente una vez.

### Aplicar el schema

El intento inicial con `heroku pg:psql < archivo.sql` fallo con un error confuso ("Unknown database"). La causa fue que la CLI de Heroku interpretaba el contenido del stdin como argumento. La solucion fue usar `psql` directamente con la URL de conexion:

```bash
# Primero las extensiones (uuid-ossp, pgcrypto, unaccent)
psql "$(heroku config:get DATABASE_URL --app panaderia-api)?sslmode=require" \
  < panaderia_db/database/00_init.sql

# Luego el schema completo (12 tablas, triggers, constraints)
psql "$(heroku config:get DATABASE_URL --app panaderia-api)?sslmode=require" \
  < panaderia_db/database/01_schema.sql

# Seed base (usuarios, categorias, productos, ingredientes)
psql "$(heroku config:get DATABASE_URL --app panaderia-api)?sslmode=require" \
  < panaderia_db/database/seeds.sql
```

Al correr `00_init.sql` aparecieron errores `must be owner of extension`. Son inofensivos: Heroku ya habia creado las extensiones con el superusuario al provisionar la BD. Las extensiones quedaron activas, como lo confirmaron los tres `CREATE EXTENSION` al inicio del output.

### Datos de demo para el asistente AI

Para que el asistente AI tuviera datos reales con los que responder preguntas, corri el script de generacion de datos sinteticos contra la BD de produccion. El script genera 90 dias de ventas con patrones estacionales, lotes de produccion, compras de ingredientes y gastos operativos.

El script originalmente leia la conexion desde el `.env` local. Lo modifiqué para aceptar `DATABASE_URL` como variable de entorno:

```bash
DATABASE_URL=$(heroku config:get DATABASE_URL --app panaderia-api) \
  python panaderia_db/scripts/generate_demo_data.py
```

---

## 7. Deploy del frontend en Vercel

1. Crear proyecto en vercel.com → Import desde GitHub
2. **Root Directory:** `panaderia_web` (critico — sino Vercel intenta buildear desde la raiz del monorepo)
3. Framework preset: Vite (detectado automaticamente)
4. Agregar variables de entorno antes de deployar:
   - `VITE_API_URL` = URL del dyno de Heroku (con `https://`, sin trailing slash)
   - `VITE_LOYALTY_POINTS_RATIO` = `10`
5. Deploy

Vercel asigno el dominio `bakery-pink-delta.vercel.app`. Cada push a `main` en GitHub dispara un redeploy automatico.

---

## 8. CORS

CORS fue el primer error visible post-deploy: el browser bloqueaba los requests del frontend al backend porque el origen no estaba en la lista permitida.

El backend tiene un campo `ALLOWED_ORIGINS` en `config.py` que acepta una lista de origenes separados por comas. En desarrollo apunta a `localhost`. En produccion lo seteé con el dominio exacto de Vercel:

```bash
heroku config:set \
  ALLOWED_ORIGINS=https://bakery-pink-delta.vercel.app \
  --app panaderia-api
```

Una vez actualizado el dyno, el login funcionó correctamente.

**Lo que no hice:** `ALLOWED_ORIGINS=*`. Aunque en este proyecto los riesgos son menores porque se usa JWT en header en lugar de cookies, es mala practica y no es algo que quiero mostrar en un proyecto de portafolio.

---

## 9. Proteccion del endpoint AI

El endpoint `/api/v1/ai/chat` consume tokens de Anthropic con cada request. En un proyecto de portafolio publico esto representa un riesgo real: si alguien lo usa de forma abusiva, la factura llega a mi tarjeta.

Implementé dos capas de proteccion complementarias:

### Capa 1: Rate limiting por usuario (en el codigo)

Agregué un rate limiter en memoria directamente en el endpoint: maximo 30 requests por usuario autenticado por hora. Si se supera, el servidor responde `HTTP 429` con un mensaje explicativo.

```python
_AI_RATE_LIMIT = 30
_ai_usage: dict[str, list[datetime]] = defaultdict(list)

def _check_rate_limit(user_id: str) -> None:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=1)
    _ai_usage[user_id] = [t for t in _ai_usage[user_id] if t > cutoff]
    if len(_ai_usage[user_id]) >= _AI_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Límite alcanzado...")
    _ai_usage[user_id].append(now)
```

El contador vive en memoria — se resetea con cada reinicio del dyno, lo cual es aceptable para este caso de uso.

### Capa 2: Spending limit en Anthropic Console

En el dashboard de Anthropic, configuré un limite mensual de gasto. Si se alcanza, la API responde `429` y el chat muestra un error al usuario. La tarjeta no se carga por encima del limite. Esta capa no requirio ningun cambio de codigo.

El endpoint ya estaba protegido por autenticacion JWT desde el inicio — cualquier request sin token valido recibe `401` antes de llegar al rate limiter.

---

## 10. Problemas reales que enfrenté

### El push a Heroku fue rechazado

El primer `git push heroku main` fallo con:

```
Your app does not include a heroku.yml build manifest.
Push rejected to panaderia-api.
```

La causa: habia creado `heroku.yml` pero no lo habia commiteado. Heroku necesita el archivo en el repositorio para saber que debe usar container stack. La solucion fue un `git add heroku.yml && git commit` antes del push.

### uuid_generate_v4() no existe

Al correr `01_schema.sql` sin haber corrido `00_init.sql` primero, todas las tablas fallaron con:

```
ERROR: function uuid_generate_v4() does not exist
```

La extension `uuid-ossp` no estaba activa. La solucion fue correr los archivos en orden: primero `00_init.sql` (extensiones), luego `01_schema.sql` (tablas).

### heroku pg:psql no acepta stdin con <

El comando `heroku pg:psql --app panaderia-api < archivo.sql` devolvio "Unknown database: -- PANADERÍA...". La CLI de Heroku estaba interpretando la primera linea del archivo como nombre de base de datos. Lo resolvi usando `psql` directamente con la URL de conexion completa.

### El script de demo data se trabo

Correr el script de generacion de datos sinteticos contra la BD remota de Heroku era extremadamente lento: el script hacia un round-trip de red por cada una de las ~700 ventas. Lo resolvi acumulando todos los registros en listas y usando `execute_values` para insertar en batch con una sola llamada por tabla.

### El grafico de ventas mostraba SNaN

El grafico "Ventas por semana" en el modulo de finanzas mostraba una sola barra negra con la etiqueta "SNaN '26". La funcion `isoWeek` agregaba `T00:00:00` al string de fecha antes de parsearlo, pero el campo `sale_date` del backend llega como datetime completo (`2026-04-01T10:30:00+00:00`). La concatenacion producía una fecha invalida y `NaN` como numero de semana.

La correccion fue de un caracter: `dateStr.slice(0, 10)` para tomar solo la parte de fecha antes de parsear.

---

## 11. Practicas que apliqué y por qué

| Practica | Por qué |
|---|---|
| Container stack en Heroku (Docker) | El Dockerfile ya existia y era multi-stage. Mas predecible que buildpacks para este stack de Python + uv |
| `${PORT:-8000}` en el CMD del Dockerfile | Heroku asigna el puerto dinamicamente. Sin esto el dyno arranca pero no recibe trafico |
| `vercel.json` con rewrite a `index.html` | Sin esto, recargar cualquier ruta del SPA devuelve 404 en Vercel |
| `SECRET_KEY` generada con `openssl rand -hex 32` | Clave de 256 bits aleatoria, distinta entre dev y produccion |
| `ALLOWED_ORIGINS` con dominio exacto | Evitar `*` que permite cualquier origen llamar la API |
| Rate limiting en endpoint AI | Proteger contra uso abusivo que genere costos en Anthropic |
| Spending cap en Anthropic Console | Segunda capa de proteccion independiente del codigo |
| `DATABASE_URL` extraida en partes | El `config.py` esta diseñado para recibir credenciales separadas, compatible con Docker Compose local |
| Seed de datos en produccion | El asistente AI necesita datos reales para responder preguntas. Sin seed, las respuestas son triviales |
