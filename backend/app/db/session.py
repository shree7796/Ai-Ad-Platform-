"""
Database session management.
"""

import asyncio
import logging
from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

logger = logging.getLogger(__name__)

# Local Postgres in Docker / dev typically has SSL off; asyncpg may otherwise probe SSL and time out.
_ASYNC_CONNECT = {"ssl": False}

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
            connect_args=_ASYNC_CONNECT,
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
    last_exc: Exception | None = None
    for attempt in range(1, 11):
        temp_engine = create_async_engine(
            settings.database_url,
            connect_args=_ASYNC_CONNECT,
            pool_pre_ping=True,
        )
        try:
            async with temp_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            await temp_engine.dispose()
            return
        except Exception as exc:
            last_exc = exc
            await temp_engine.dispose()
            logger.warning(
                "init_db attempt %s/10 failed (waiting for Postgres): %s",
                attempt,
                exc,
            )
            await asyncio.sleep(2)
    if last_exc is not None:
        raise last_exc
    raise RuntimeError("init_db failed")
