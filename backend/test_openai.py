import asyncio
import os
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.services.prompt_engine import PromptEngine

async def test_openai():
    os.environ["LLM_PROVIDER"] = "openai"
    # The key is already in .env which is loaded by get_settings()
    engine = PromptEngine()
    
    test_prompt = "A high-end sports car driving through a neon-lit city at night"
    print(f"Testing OpenAI with prompt: '{test_prompt}'")
    
    try:
        enhanced = await engine.enhance(test_prompt)
        print("\n--- ENHANCED PROMPT ---")
        print(enhanced)
        print("-----------------------\n")
        
        if "Cinematic" in enhanced or len(enhanced) > len(test_prompt):
            print("SUCCESS: OpenAI enhancement is working!")
        else:
            print("WARNING: Enhancement returned but doesn't look significantly different. Check if it hit mock fallback.")
            
    except Exception as e:
        print(f"FAILURE: OpenAI test failed with error: {e}")

if __name__ == "__main__":
    asyncio.run(test_openai())
