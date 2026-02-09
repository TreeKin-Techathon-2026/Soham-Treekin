from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from ..database import Base
import enum


class ReportType(str, enum.Enum):
    TREE_CUTTING = "tree_cutting"
    ILLEGAL_DUMPING = "illegal_dumping"
    POLLUTION = "pollution"
    WILDLIFE_HARM = "wildlife_harm"
    OTHER = "other"


class ReportStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class CivicReport(Base):
    """Geo-tagged civic reports for environmental issues."""
    
    __tablename__ = "civic_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    report_type = Column(String(30), default=ReportType.OTHER.value)
    
    # Location
    geo_lat = Column(Float, nullable=False)
    geo_lng = Column(Float, nullable=False)
    address = Column(String(500))
    
    # Evidence
    evidence_urls = Column(JSON, default=list)  # Images/videos
    
    # Status & Moderation
    status = Column(String(20), default=ReportStatus.PENDING.value)
    votes_count = Column(Integer, default=0)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    
    # Resolution
    resolved_by_id = Column(Integer, ForeignKey("users.id"))
    resolution_notes = Column(Text)
    resolved_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<CivicReport {self.id}: {self.title}>"


class ReportVote(Base):
    """Community votes on civic reports."""
    
    __tablename__ = "report_votes"
    
    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("civic_reports.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    is_upvote = Column(Integer, default=1)  # 1 for upvote, -1 for downvote
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ReportVote by User {self.user_id} on Report {self.report_id}>"
