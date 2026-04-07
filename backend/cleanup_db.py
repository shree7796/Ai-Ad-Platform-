from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Use a local engine first, but we will run this inside the API container
DATABASE_URL = "postgresql://adgen:adgen_secret@postgres:5432/adgen_db"

def cleanup():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        # Reset stalled text_to_image scenes
        sql = text("UPDATE scenes SET status='failed', error_message='Worker queue initialization error' WHERE status IN ('pending', 'generating', 'processing') AND task_type='text_to_image'")
        session.execute(sql)
        session.commit()
        print("Cleanup successful")
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    cleanup()
