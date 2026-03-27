# 1. dependency builder
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copiar solo los archivos de dependencias primero
COPY pyproject.toml uv.lock ./

# Instalar dependencias de producción en el .venv del proyecto
# --frozen: falla si uv.lock no está actualizado
# --no-dev: excluye pytest, httpx y otras herramientas de desarrollo
RUN uv sync --frozen --no-dev --no-install-project

# Copiar el código fuente e instalar el proyecto
COPY . .
RUN uv sync --frozen --no-dev


# 2. runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

# Usuario no-root para reducir superficie de ataque
RUN adduser --disabled-password --gecos "" --uid 1001 appuser

# Copiar el entorno virtual completo desde el stage builder
COPY --from=builder /app/.venv /app/.venv

# Copiar el código fuente de la aplicación
COPY --from=builder /app/src ./src
COPY --from=builder /app/main.py ./main.py

RUN chown -R appuser:appuser /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
