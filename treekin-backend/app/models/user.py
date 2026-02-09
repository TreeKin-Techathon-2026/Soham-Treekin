from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class User(Base):
    """User model for authentication and profiles."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Profile
    display_name = Column(String(100))
    avatar_url = Column(String(500))
    bio = Column(Text)
    phone = Column(String(20))
    location = Column(String(200))
    
    # Wallet & Stats
    tredits_balance = Column(Float, default=0.0)
    total_carbon_saved = Column(Float, default=0.0)
    trees_planted = Column(Integer, default=0)
    trees_adopted = Column(Integer, default=0)
    
    # Roles
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_ngo = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Note: Relationships commented out temporarily due to SQLite compatibility issues
    # These will be enabled once PostgreSQL is configured
    # trees = relationship("Tree", back_populates="owner", foreign_keys="Tree.owner_id")
    # adopted_trees = relationship("Tree", back_populates="adopter", foreign_keys="Tree.adopter_id")
    # posts = relationship("Post", back_populates="user")
    # comments = relationship("Comment", back_populates="user")
    # likes = relationship("Like", back_populates="user")
    # carbon_credits = relationship("CarbonCredit", back_populates="user")
    
    def __repr__(self):
        return f"<User {self.username}>"
