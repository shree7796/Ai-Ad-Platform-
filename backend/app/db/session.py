"""
Database session management.
"""

import asyncio
from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

# Cache for engines to ensure we create only one engine per event loop
# This prevents "MissingGreenlet" and loop-contamination errors in Celery/FastAPI.
_engines: Dict[int, any] = {}
_session_factories: Dict[int, any] = {}

def get_async_session_factory():
    """Provides a loop-safe async session factory. Single-instance per event loop."""
    loop = asyncio.get_event_loop()
    loop_id = id(loop)
    
    if loop_id not in _session_factories:
        engine = create_async_engine(
            settings.database_url,
            echo=settings.debug,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True,
        )
        _engines[loop_id] = engine
        _session_factories[loop_id] = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
    
    return _session_factories[loop_id]



class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency that provides a database session."""
    factory = get_async_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Create all tables (for development). Use Alembic in production."""
    # We do a one-off engine for initialization
    temp_engine = create_async_engine(settings.database_url)
    async with temp_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await temp_engine.dispose()
