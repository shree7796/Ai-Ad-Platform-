from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://adgen:adgen_secret@postgres:5432/adgen_db"

def run_migration():
    engine = create_engine(DATABASE_URL)
    with engine.begin() as conn:
        print("Running: ALTER TABLE projects ADD COLUMN IF NOT EXISTS task_type VARCHAR(50)")
        conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS task_type VARCHAR(50)"))
        print("Migration complete")

if __name__ == "__main__":
    run_migration()
