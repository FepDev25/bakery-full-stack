# manejo de errores para convertir excepciones de dominio en respuestas JSON

from fastapi import Request
from fastapi.responses import JSONResponse

from src.core.exceptions import DomainException
from src.core.logging import get_logger

logger = get_logger(__name__)

# convierto de DomainException a JSONResponse
async def domain_exception_handler(request: Request, exc: DomainException) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", None)

    logger.warning(
        exc.message,
        extra={
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": exc.status_code,
        },
    )

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.__class__.__name__,
            "detail": exc.message,
            "status": exc.status_code,
        },
    )

# captura excepciones no manejadas para evitar exponer stack traces al cliente
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", None)

    logger.exception(
        "Error inesperado",
        extra={
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": 500,
        },
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "detail": "Ocurrió un error inesperado. Por favor intente más tarde.",
            "status": 500,
        },
    )
