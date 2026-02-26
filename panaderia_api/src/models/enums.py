import enum

class ProductUnit(str, enum.Enum):
    UNIDAD = "unidad"
    KG = "kg"
    GRAMO = "gramo"
    DOCENA = "docena"
    MEDIA_DOCENA = "media docena"

class IngredientUnit(str, enum.Enum):
    KG = "kg"
    GRAMO = "gramo"
    LITRO = "litro"
    ML = "ml"
    UNIDAD = "unidad"

class Role(str, enum.Enum):
    ADMIN = "admin"
    CAJERO = "cajero"
    PANADERO = "panadero"
    CONTADOR = "contador"

class PaymentMethod(str, enum.Enum):
    EFECTIVO = 'efectivo'
    TARJETA_DEBITO = 'tarjeta_debito'
    TARJETA_CREDITO = 'tarjeta_credito'
    TRANSFERENCIA = 'transferencia'
    QR = 'qr'

class SaleStatus(str, enum.Enum):
    COMPLETADA = 'completada'
    CANCELADA = 'cancelada'