# excepcion base para todos los errores de dominio
class DomainException(Exception):

    def __init__(self, message: str, status_code: int = 400) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)

# clases específicas para distintos tipos de errores de dominio, cada una con un status code HTTP apropiado
class NotFoundException(DomainException):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=404)


class ValidationError(DomainException):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=400)

class InsufficientStockError(ValidationError):
    pass


class InvalidDiscountError(ValidationError):
    pass


class DuplicateEntityError(DomainException):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=409)


class DeleteConstraintError(DomainException):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=409)

# no autenticado o sin permisos suficientes, aunque el token sea válido
class UnauthorizedError(DomainException):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=401)

# autenticado pero sin el rol necesario para acceder al recurso
class ForbiddenError(DomainException):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=403)
