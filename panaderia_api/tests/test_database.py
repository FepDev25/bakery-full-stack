import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import engine, get_async_db
from src.core.config import settings

# verifica que el engine se configuró con la URL correcta
def test_engine_url():
    assert engine.url.render_as_string(hide_password=False) == settings.DATABASE_URL

# verifica conexión real a la BD
@pytest.mark.asyncio
async def test_get_async_db_yields_session():
    gen = get_async_db()
    session = await gen.__anext__()
    assert isinstance(session, AsyncSession)
    await gen.aclose()
