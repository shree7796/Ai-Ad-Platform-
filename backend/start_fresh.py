from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# API DB connection URL
DATABASE_URL = "postgresql://adgen:adgen_secret@postgres:5432/adgen_db"

def start_fresh():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        print("Truncating tables...")
        # Order matters due to foreign keys, or use CASCADE
        session.execute(text("TRUNCATE TABLE drafts CASCADE"))
        session.execute(text("TRUNCATE TABLE scenes CASCADE"))
        session.execute(text("TRUNCATE TABLE usage_logs CASCADE"))
        session.execute(text("TRUNCATE TABLE projects CASCADE"))
        session.commit()
        print("Success: All assets cleared. Dashboard will be fresh.")
    except Exception as e:
        print(f"Error: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    start_fresh()
