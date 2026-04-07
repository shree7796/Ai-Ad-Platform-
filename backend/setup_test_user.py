import asyncio
import uuid
from app.db.session import get_async_session_factory
from app.models.user import User
from app.api.deps import hash_password
from sqlalchemy import select

async def setup_test_user():
    factory = get_async_session_factory()
    async with factory() as db:
        # Check if user exists
        stmt = select(User).where(User.email == "test@example.com")
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print("Creating test user...")
            user = User(
                id=uuid.uuid4(),
                email="test@example.com",
                username="testuser",
                hashed_password=hash_password("password123"),
                is_active=True,
                plan="premium"
            )
            db.add(user)
            await db.commit()
            print(f"User created: {user.id}")
        else:
            print(f"User already exists: {user.id}")
            # Ensure it has premium plan for testing
            user.plan = "premium"
            await db.commit()
            
        return user.id

if __name__ == "__main__":
    asyncio.run(setup_test_user())
