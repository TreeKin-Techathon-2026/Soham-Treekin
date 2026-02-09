from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .user import UserSummary


class PostBase(BaseModel):
    content: str
    tree_id: int


class PostCreate(PostBase):
    media_urls: Optional[List[str]] = []


class PostUpdate(BaseModel):
    content: Optional[str] = None


class PostResponse(PostBase):
    id: int
    user_id: int
    user: Optional[UserSummary] = None
    media_urls: List[str] = []
    likes_count: int = 0
    comments_count: int = 0
    is_verified: bool = False
    verification_votes: int = 0
    created_at: datetime
    is_liked: Optional[bool] = False  # For current user context

    class Config:
        from_attributes = True


class CommentBase(BaseModel):
    content: str


class CommentCreate(CommentBase):
    post_id: int


class CommentResponse(CommentBase):
    id: int
    post_id: int
    user_id: int
    user: Optional[UserSummary] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LikeResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class VerifyVoteRequest(BaseModel):
    post_id: int
    is_verified: bool = True
