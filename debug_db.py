import asyncio
import os
import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql://adgen:adgen_secret@localhost:5432/adgen_db"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def check_scenes():
    session = Session()
    try:
        # Check current scenes
        result = session.execute(text("SELECT id, status, task_type, celery_task_id, error_message FROM scenes ORDER BY created_at DESC LIMIT 5"))
        print("\n--- Recent Scenes ---")
        for row in result:
            print(f"ID: {row[0]}, Status: {row[1]}, Task Type: {row[2]}, Task ID: {row[3]}, Error: {row[4]}")
        
        # Check models table to see what is active
        result = session.execute(text("SELECT name, provider, is_active, supported_tasks FROM ai_models"))
        print("\n--- Active Models ---")
        for row in result:
            print(f"Name: {row[0]}, Provider: {row[1]}, Active: {row[2]}, Tasks: {row[3]}")
            
    finally:
        session.close()

if __name__ == "__main__":
    check_scenes()
