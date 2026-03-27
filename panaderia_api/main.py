from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.v1.router import router as api_v1_router
from src.core.config import settings
from src.core.exceptions import DomainException
from src.core.logging import setup_logging
from src.middleware.error_handler import domain_exception_handler, unhandled_exception_handler
from src.middleware.logging import RequestLoggingMiddleware

setup_logging(level=settings.LOG_LEVEL)

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="API de gestión para panadería: ventas, producción, inventario y gastos.",
    contact={"name": "FepDev", "email": "lamediatricolor@gmail.com"},
    lifespan=lifespan,
)

# Middlewares, primero en registrarse es el último en ejecutarse
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Manejadores de excepciones
app.add_exception_handler(DomainException, domain_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# incluir rutas
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# Endpoint de salud
@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    return {"status": "ok", "version": settings.PROJECT_NAME}
