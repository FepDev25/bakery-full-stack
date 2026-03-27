# modulo para manejar la paginación de resultados en las respuestas de la API

from math import ceil
from typing import Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel

# Tipo genérico para los items de la respuesta paginada
T = TypeVar("T")

# Clase para manejar los parámetros de paginación en las consultas
class PaginationParams:
    def __init__(
        self,
        page: int = Query(default=1, ge=1, description="Número de página (1-indexed)"),
        page_size: int = Query(default=20, ge=1, le=100, description="Tamaño de página"),
    ) -> None:
        self.page = page
        self.page_size = page_size
        self.skip = (page - 1) * page_size
        self.limit = page_size

# Clase para la respuesta paginada, que incluye metadata sobre la paginación y los items
class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: list[T]

    @classmethod
    def build(
        cls,
        items: list[T],
        total: int,
        params: PaginationParams,
    ) -> "PaginatedResponse[T]":
        total_pages = ceil(total / params.page_size) if params.page_size > 0 else 0
        return cls(
            total=total,
            page=params.page,
            page_size=params.page_size,
            total_pages=total_pages,
            items=items,
        )
