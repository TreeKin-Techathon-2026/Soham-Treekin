from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings
import os

# Try PostgreSQL first, fall back to SQLite if it fails
database_url = settings.database_url

def _create_engine_with_fallback():
    """Try to connect to configured DB, fall back to SQLite if unavailable."""
    # For SQLite: add check_same_thread
    if database_url.startswith("sqlite"):
        return create_engine(database_url, connect_args={"check_same_thread": False})

    # Try PostgreSQL
    try:
        engine = create_engine(database_url, pool_pre_ping=True)
        # Test connection immediately
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"[TreeKin] Connected to PostgreSQL.")
        return engine
    except Exception as e:
        # Fall back to SQLite
        sqlite_url = "sqlite:///./treekin.db"
        print(f"[TreeKin] PostgreSQL unavailable ({type(e).__name__}). Falling back to SQLite: {sqlite_url}")
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

# Create database engine
engine = _create_engine_with_fallback()

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency that provides database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables."""
    from . import models  # Import all models to register them
    Base.metadata.create_all(bind=engine)

