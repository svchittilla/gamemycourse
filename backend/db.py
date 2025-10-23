from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Dev: SQLite. (Easy to swap to Postgres later.)
DATABASE_URL = "sqlite:///./gamemycourse.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite-specific
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
