import enum

class ProductUnit(str, enum.Enum):
    UNIDAD = "unidad"
    KG = "kg"
    GRAMO = "gramo"
    DOCENA = "docena"
    MEDIA_DOCENA = "media_docena"
