"""
Tests de integración: autenticación JWT y RBAC real.

Estos tests ejercen el middleware JWT completo:
  - decode_token() verifica la firma y el tipo.
  - get_current_user() busca el usuario en la BD de test.
  - require_role() comprueba el rol del usuario encontrado.

El fixture `remove_auth_bypass` elimina el override de get_current_user
establecido por el bypass_auth global, forzando a que todos los endpoints
en este módulo pasen por la autenticación real.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from src.core.dependencies import get_current_user
from src.core.security import create_access_token
from src.models.enums import Role
from tests.integration.conftest import _create_user


@pytest.fixture(autouse=True)
def remove_auth_bypass() -> None:
    """
    Elimina el override global de get_current_user para que estos tests
    usen el flujo real de autenticación JWT + consulta a BD.
    """
    app.dependency_overrides.pop(get_current_user, None)
    yield


async def test_protected_endpoint_without_token_returns_401(
    http_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Sin cabecera Authorization el servidor rechaza la petición con 401."""
    response = await http_client.get("/api/v1/ingredients")
    assert response.status_code == 401


async def test_protected_endpoint_with_invalid_token_returns_401(
    http_client: AsyncClient, db_session: AsyncSession
) -> None:
    """Token malformado o firmado con clave distinta devuelve 401."""
    response = await http_client.get(
        "/api/v1/ingredients",
        headers={"Authorization": "Bearer este-token-no-es-valido"},
    )
    assert response.status_code == 401


async def test_cajero_cannot_register_ingredient_purchase(
    http_client: AsyncClient, db_session: AsyncSession
) -> None:
    """
    RBAC: el rol CAJERO no tiene acceso a POST /ingredient-purchases (solo ADMIN/CONTADOR).
    Se crea un usuario cajero real en la BD de test, se genera un JWT válido,
    y se verifica que el servidor devuelva 403.
    """
    cajero = await _create_user(db_session, role=Role.CAJERO)
    token = create_access_token({"sub": str(cajero.id)})

    response = await http_client.post(
        "/api/v1/ingredient-purchases",
        json={},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


async def test_admin_can_access_protected_endpoint(
    http_client: AsyncClient, db_session: AsyncSession
) -> None:
    """
    Un usuario ADMIN con JWT válido accede correctamente a un endpoint protegido.
    Verifica el flujo completo: JWT → get_current_user → query BD → 200.
    """
    admin = await _create_user(db_session, role=Role.ADMIN)
    token = create_access_token({"sub": str(admin.id)})

    response = await http_client.get(
        "/api/v1/ingredients",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
