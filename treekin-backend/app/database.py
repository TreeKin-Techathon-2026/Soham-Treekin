from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings
import os

# Use SQLite if PostgreSQL is not configured or fails
database_url = settings.database_url

# For SQLite compatibility
connect_args = {}
if database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Create database engine
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    connect_args=connect_args
)

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
