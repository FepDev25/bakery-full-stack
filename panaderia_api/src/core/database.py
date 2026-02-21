from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from src.core.config import settings

# motor de base de datos asincrono
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,
    future=True
)

# fabrica de sesiones asincronas
async_session_local = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# base para modelos ORM
class Base(DeclarativeBase):
    pass

# dependencia para inyectar la sesion de base de datos
async def get_async_db():
    async with async_session_local() as session:
        yield session
