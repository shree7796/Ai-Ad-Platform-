from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Use a local engine first, but we will run this inside the API container
DATABASE_URL = "postgresql://adgen:adgen_secret@postgres:5432/adgen_db"

def cleanup():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        # 1. Delete drafts for non-completed scenes
        session.execute(text("DELETE FROM drafts WHERE scene_id IN (SELECT id FROM scenes WHERE status != 'completed')"))
        
        # 2. Delete non-completed scenes
        session.execute(text("DELETE FROM scenes WHERE status != 'completed'"))
        
        # 3. Delete usage logs for failed generations
        session.execute(text("DELETE FROM usage_logs WHERE action='generation' AND cost=0"))
        
        # 4. Update processing projects to failed
        session.execute(text("UPDATE projects SET status='failed' WHERE status='processing'"))
        
        session.commit()
        print("Stuck tasks deleted successfully")
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    cleanup()
