from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base
import enum


class TreeStatus(str, enum.Enum):
    PLANTED = "planted"
    ADOPTED = "adopted"
    VERIFIED = "verified"
    MEMORIAL = "memorial"


class EventType(str, enum.Enum):
    NONE = "none"
    COUPLE = "couple"
    NEWBORN = "newborn"
    MEMORIAL = "memorial"
    ACHIEVEMENT = "achievement"
    CUSTOM = "custom"


class HealthStatus(str, enum.Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    UNKNOWN = "unknown"


class Tree(Base):
    """Tree model for tracking planted/adopted trees."""
    
    __tablename__ = "trees"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    species = Column(String(100))
    description = Column(Text)
    
    # Location
    geo_lat = Column(Float)
    geo_lng = Column(Float)
    address = Column(String(500))
    
    # Ownership
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    adopter_id = Column(Integer, ForeignKey("users.id"))
    sponsor_id = Column(Integer, ForeignKey("users.id"))
    
    # Status
    status = Column(String(20), default=TreeStatus.PLANTED.value)
    health_status = Column(String(20), default=HealthStatus.UNKNOWN.value)
    
    # Event-based trees
    event_type = Column(String(20), default=EventType.NONE.value)
    event_data = Column(JSON)  # Custom event data (date, names, etc.)
    
    # Physical attributes
    height_cm = Column(Float)
    age_months = Column(Integer)
    planted_date = Column(DateTime(timezone=True))
    
    # Carbon & Rewards
    carbon_credits = Column(Float, default=0.0)
    total_tredits_earned = Column(Float, default=0.0)
    
    # Media
    main_image_url = Column(String(500))
    images = Column(JSON, default=list)  # List of image URLs
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    adopter = relationship("User", foreign_keys=[adopter_id])
    posts = relationship("Post", back_populates="tree", cascade="all, delete-orphan")
    carbon_records = relationship("CarbonCredit", back_populates="tree", cascade="all, delete-orphan")
    events = relationship("TreeEvent", back_populates="tree", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Tree {self.name}>"


class TreeEvent(Base):
    """Events/milestones for a tree."""
    
    __tablename__ = "tree_events"
    
    id = Column(Integer, primary_key=True, index=True)
    tree_id = Column(Integer, ForeignKey("trees.id", ondelete="CASCADE"), nullable=False)
    
    event_name = Column(String(200), nullable=False)
    event_description = Column(Text)
    event_date = Column(DateTime(timezone=True))
    event_data = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    tree = relationship("Tree", back_populates="events")
