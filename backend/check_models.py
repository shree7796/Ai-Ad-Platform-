import asyncio
from app.db.session import get_async_session_factory
from app.models.ai_model import AIModel
from sqlalchemy import select

async def check_models():
    factory = get_async_session_factory()
    async with factory() as db:
        stmt = select(AIModel)
        result = await db.execute(stmt)
        models = result.scalars().all()
        for m in models:
            print(f"Name: {m.name}, Provider: {m.provider}, Active: {m.is_active}, Tasks: {m.supported_tasks}")

if __name__ == "__main__":
    asyncio.run(check_models())
