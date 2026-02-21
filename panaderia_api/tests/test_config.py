from src.core.config import settings

def test_settings_load():
    assert settings.PROJECT_NAME == "panaderia_api"
    assert settings.POSTGRES_PORT == 5433

def test_database_url_format():
    url = settings.DATABASE_URL
    assert url.startswith("postgresql+asyncpg://")
    assert settings.POSTGRES_USER in url
    assert settings.POSTGRES_SERVER in url
    assert str(settings.POSTGRES_PORT) in url
    assert settings.POSTGRES_DB in url
