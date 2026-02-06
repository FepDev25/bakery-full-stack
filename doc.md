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

