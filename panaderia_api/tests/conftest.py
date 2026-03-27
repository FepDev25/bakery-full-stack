import uuid

import pytest
from fastapi.testclient import TestClient

from main import app
from src.core.dependencies import get_current_user
from src.models.enums import Role
from src.models.user import User


def make_admin_user() -> User:
    user = User()
    user.id = uuid.uuid4()
    user.email = "admin@test.com"
    user.full_name = "Admin Test"
    user.role = Role.ADMIN
    user.is_active = True
    user.last_login = None
    return user

# Bypasea la autenticación en todos los tests. Cada test puede sobreescribir get_current_user en su propio fixture si necesita probar comportamiento de auth
@pytest.fixture(autouse=True)
def bypass_auth():
    admin = make_admin_user()
    app.dependency_overrides[get_current_user] = lambda: admin
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as c:
        yield c
