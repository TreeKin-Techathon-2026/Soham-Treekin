from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: str
    username: str
    display_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None


class UserResponse(UserBase):
    id: int
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    tredits_balance: float = 0.0
    total_carbon_saved: float = 0.0
    trees_planted: int = 0
    trees_adopted: int = 0
    is_verified: bool = False
    is_ngo: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class UserSummary(BaseModel):
    """Minimal user info for embedding in other responses."""
    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True
