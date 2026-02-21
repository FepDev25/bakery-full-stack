import enum

class ProductUnit(str, enum.Enum):
    UNIDAD = "unidad"
    KG = "kg"
    GRAMO = "gramo"
    DOCENA = "docena"
    MEDIA_DOCENA = "media_docena"

class IngredientUnit(str, enum.Enum):
    KG = "kg"
    GRAMO = "gramo"
    LITRO = "litro"
    MILILITRO = "mililitro"
    UNIDAD = "unidad"
