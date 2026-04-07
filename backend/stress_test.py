import asyncio
import httpx
import uuid
import time

API_URL = "http://localhost:8000/api/v1"
TEST_USER = {
    "email": "stress_test@example.com",
    "password": "password123",
    "username": f"stress_user_{uuid.uuid4().hex[:6]}",
    "full_name": "Stress Tester"
}

async def get_auth_token(client):
    """Register or Login to get a valid JWT token."""
    print(f"Authenticating as {TEST_USER['email']}...")
    try:
        # Try Login
        login_res = await client.post(f"{API_URL}/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        
        if login_res.status_code == 200:
            print("Login successful.")
            return login_res.json()["access_token"]
            
        # If login fails, try Register
        print("Login failed, attempting registration...")
        reg_res = await client.post(f"{API_URL}/auth/register", json=TEST_USER)
        if reg_res.status_code == 201:
            print("Registration successful.")
            return reg_res.json()["access_token"]
        
        print(f"Authentication failed: {reg_res.text}")
        return None
    except Exception as e:
        print(f"Auth error: {e}")
        return None

async def trigger_generation(client, task_type, title, headers, requested_provider=None):
    print(f"Triggering {task_type}: {title}")
    try:
        # 1. Create Project
        form_data = {
            "title": title,
            "task_type": task_type
        }
        res = await client.post(f"{API_URL}/projects/", data=form_data, headers=headers)
        if res.status_code != 201:
            print(f"Project creation failed for {title}: {res.text}")
            return
        
        project_id = res.json()["id"]
        
        # 2. Trigger Generation
        gen_data = {
            "project_id": project_id,
            "prompt": f"Stress test for {title}",
            "task_type": task_type,
            "requested_provider": requested_provider
        }
        gen_res = await client.post(f"{API_URL}/generate/", json=gen_data, headers=headers)
        if gen_res.status_code != 200:
            print(f"Generation trigger failed for {title}: {gen_res.text}")
            return
            
        print(f"Success: {title} triggered. Scene ID: {gen_res.json()['scene_id']}")
    except Exception as e:
        print(f"Error in {title}: {e}")

async def stress_test():
    async with httpx.AsyncClient(timeout=30.0) as client:
        token = await get_auth_token(client)
        if not token:
            print("Could not obtain auth token. Aborting.")
            return
            
        headers = {"Authorization": f"Bearer {token}"}
        
        tasks = []
        # Mixed load: 5 Videos, 5 Images
        # Explicitly request 'fal' for some to test routing and logging
        for i in range(5):
            provider = "fal" if i % 2 == 0 else None
            tasks.append(trigger_generation(client, "text_to_video", f"Video Stress {i}", headers, provider))
            tasks.append(trigger_generation(client, "text_to_image", f"Image Stress {i}", headers, provider))
            
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    print("Starting Senior-Level Async Stress Test with Auth Integration...")
    start_time = time.time()
    asyncio.run(stress_test())
    print(f"Stress test finished in {time.time() - start_time:.2f}s")
