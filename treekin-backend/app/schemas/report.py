from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .user import UserSummary


class ReportBase(BaseModel):
    title: str
    description: str
    report_type: str = "other"
    geo_lat: float
    geo_lng: float
    address: Optional[str] = None


class ReportCreate(ReportBase):
    evidence_urls: Optional[List[str]] = []


class ReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    resolution_notes: Optional[str] = None


class ReportResponse(ReportBase):
    id: int
    reporter_id: int
    reporter: Optional[UserSummary] = None
    evidence_urls: List[str] = []
    status: str
    votes_count: int = 0
    upvotes: int = 0
    downvotes: int = 0
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReportVoteRequest(BaseModel):
    report_id: int
    is_upvote: bool = True


class ReportVoteResponse(BaseModel):
    id: int
    report_id: int
    user_id: int
    is_upvote: int
    created_at: datetime

    class Config:
        from_attributes = True
