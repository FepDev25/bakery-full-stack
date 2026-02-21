# Documentacion de mi creacion de el proyecto

## Inicio del proyecto
 
Me decidi por el gestor de paquetes uv con:

```bash
uv init --python=3.12
```

Cree la carpeta con

```bash
mkdir panaderia_api
```

Inicie alembic con:

```bash
uv run alembic init alembic
```

Despues fui creando la estructura de carpetas con

```bash
panaderia/panaderia_api master* ❯ mkdir src                   12:30:07 
panaderia/panaderia_api master* ❯ cd src                      12:31:18 
panaderia/panaderia_api/src master* ❯ mkdir core              12:31:24 
panaderia/panaderia_api/src master* ❯ mkdir models            12:31:41 
panaderia/panaderia_api/src master* ❯ mkdir schemas           12:31:44 
panaderia/panaderia_api/src master* ❯ mkdir repositories      12:31:52 
panaderia/panaderia_api/src master* ❯ mkdir services          12:32:02 
panaderia/panaderia_api/src master* ❯ mkdir api               12:32:08 
panaderia/panaderia_api/src master* ❯ mkdir middleware        12:32:13 
panaderia/panaderia_api/src master* ❯ mkdir utils             12:32:29 
panaderia/panaderia_api/src master* ❯ cd ..                   12:32:33 
panaderia/panaderia_api master* ❯ mkdir tests                 12:32:54 
panaderia/panaderia_api master* ❯ mkdir scripts               12:32:58 
panaderia/panaderia_api master* ❯ touch main.py               12:33:08 
panaderia/panaderia_api master* ❯
```

## Creacion de la base de datos

Cree un contenedor en docker para postgres con:

```bash
docker compose up -d
```

y en el archivo docker-compose.yml especifico la configuracion de la base de datos con mis archivos de el esquema que estan en la carpeta de database/

## Conectar base de datos con alembic

- Alembic es la herramienta de migraciones de base de datos. Sirve para versionar cambios en el esquema de la BD igual que git versiona código.

en al archivo alembic.ini puse la url de conexion a la base de datos con:

```ini
sqlalchemy.url = postgresql+psycopg2://postgres:password@localhost:5432/panaderia_db
``` 

luego cree la migracion inicial con:

```bash
uv run alembic revision -m "initial_schema"
```

y luego ejecute stamp head para decirle a Alembic: "la BD ya está en este punto, no corras nada"

```bash
uv run alembic stamp head
```

comandos utiles desde ahora: 

1. alembic revision -m "descripcion" → crea el archivo
2. editar el archivo con el cambio
3. alembic upgrade head → aplicar el cambio a la BD

## Configuracion

### config.py

creé una clase de configuracion para el proyecto, por ahora lee las variables de entorno del .env para la base de datos

## database.py

creé el engine asincrono y la fabrica de sesiones async
tambien tiene una clase base para los modelos ORM
tambien tiene dependencia para inyectar la sesion

## tests

en test estan los tests iniciales para la configuracion y la coneccion a la base de datos