import asyncio
import httpx

API_URL = "http://localhost:8000/api/v1"

async def test_gen():
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Create Project first
        print("Creating project...")
        form_data = {
            "title": "Test Project",
            "task_type": "text_to_image"
        }
        res = await client.post(f"{API_URL}/projects/", data=form_data)
        if res.status_code != 201:
            print(f"Project creation failed: {res.text}")
            return
        
        project_id = res.json()["id"]
        print(f"Project created with ID: {project_id}")

        # Trigger generation
        print("Triggering generation...")
        gen_data = {
            "project_id": project_id,
            "prompt": "A beautiful sunset over the mountains",
            "task_type": "text_to_image"
        }
        gen_res = await client.post(f"{API_URL}/generate/", json=gen_data)
        if gen_res.status_code != 200:
            print(f"Generation trigger failed: {gen_res.text}")
            return
        
        print(f"Success! Scene ID: {gen_res.json()['scene_id']}")

if __name__ == "__main__":
    asyncio.run(test_gen())
