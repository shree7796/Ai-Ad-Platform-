import asyncio
import httpx
import uuid
import time

API_URL = "http://localhost:8000/api/v1"
TEST_USER_ID = "3c945d21-79c1-421e-8270-d1d5d4d82140" # From logs earlier

async def trigger_generation(client, task_type, title):
    print(f"Triggering {task_type}: {title}")
    try:
        # 1. Create Project
        form_data = {
            "title": title,
            "task_type": task_type
        }
        res = await client.post(f"{API_URL}/projects/", data=form_data)
        if res.status_code != 201:
            print(f"Project creation failed for {title}: {res.text}")
            return
        
        project_id = res.json()["id"]
        
        # 2. Trigger Generation
        gen_data = {
            "project_id": project_id,
            "prompt": f"Stress test for {title}",
            "task_type": task_type
        }
        gen_res = await client.post(f"{API_URL}/generate/", json=gen_data)
        if gen_res.status_code != 200:
            print(f"Generation trigger failed for {title}: {gen_res.text}")
            return
            
        print(f"Success: {title} triggered. Scene ID: {gen_res.json()['scene_id']}")
    except Exception as e:
        print(f"Error in {title}: {e}")

async def stress_test():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Add auth header if needed (using debug user for now)
        # Assuming the API allows local debug access or we provide a token
        
        tasks = []
        # Mixed load: 5 Videos, 5 Images
        for i in range(5):
            tasks.append(trigger_generation(client, "text_to_video", f"Video Stress {i}"))
            tasks.append(trigger_generation(client, "text_to_image", f"Image Stress {i}"))
            
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    print("Starting Senior-Level Async Stress Test...")
    start_time = time.time()
    asyncio.run(stress_test())
    print(f"Stress test finished in {time.time() - start_time:.2f}s")
