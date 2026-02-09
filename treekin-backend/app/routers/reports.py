from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.report import CivicReport, ReportVote
from ..schemas.report import (
    ReportCreate, ReportUpdate, ReportResponse,
    ReportVoteRequest, ReportVoteResponse
)
from ..schemas.user import UserSummary
from ..services.auth_utils import get_current_user

router = APIRouter(prefix="/reports", tags=["Civic Reports"])


@router.post("/", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    report_data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new civic report."""
    report = CivicReport(
        reporter_id=current_user.id,
        title=report_data.title,
        description=report_data.description,
        report_type=report_data.report_type,
        geo_lat=report_data.geo_lat,
        geo_lng=report_data.geo_lng,
        address=report_data.address,
        evidence_urls=report_data.evidence_urls or []
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    report_response = ReportResponse.model_validate(report)
    report_response.reporter = UserSummary.model_validate(current_user)
    return report_response


@router.get("/", response_model=List[ReportResponse])
def list_reports(
    skip: int = 0,
    limit: int = 20,
    report_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List civic reports."""
    query = db.query(CivicReport)
    
    if report_type:
        query = query.filter(CivicReport.report_type == report_type)
    if status:
        query = query.filter(CivicReport.status == status)
    
    reports = query.order_by(CivicReport.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for report in reports:
        report_response = ReportResponse.model_validate(report)
        reporter = db.query(User).filter(User.id == report.reporter_id).first()
        if reporter:
            report_response.reporter = UserSummary.model_validate(reporter)
        result.append(report_response)
    
    return result


@router.get("/nearby")
def get_nearby_reports(
    lat: float,
    lng: float,
    radius_km: float = 10,
    db: Session = Depends(get_db)
):
    """Get reports near a location."""
    lat_delta = radius_km / 111
    lng_delta = radius_km / (111 * 0.85)
    
    reports = db.query(CivicReport).filter(
        CivicReport.geo_lat.between(lat - lat_delta, lat + lat_delta),
        CivicReport.geo_lng.between(lng - lng_delta, lng + lng_delta),
        CivicReport.status != "rejected"
    ).all()
    
    return [
        {
            "id": r.id,
            "title": r.title,
            "type": r.report_type,
            "lat": r.geo_lat,
            "lng": r.geo_lng,
            "status": r.status,
            "votes": r.votes_count
        }
        for r in reports
    ]


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: int, db: Session = Depends(get_db)):
    """Get report by ID."""
    report = db.query(CivicReport).filter(CivicReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report_response = ReportResponse.model_validate(report)
    reporter = db.query(User).filter(User.id == report.reporter_id).first()
    if reporter:
        report_response.reporter = UserSummary.model_validate(reporter)
    
    return report_response


@router.post("/{report_id}/vote")
def vote_report(
    report_id: int,
    vote_data: ReportVoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Vote on a report (upvote/downvote)."""
    report = db.query(CivicReport).filter(CivicReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check existing vote
    existing = db.query(ReportVote).filter(
        ReportVote.report_id == report_id,
        ReportVote.user_id == current_user.id
    ).first()
    
    vote_value = 1 if vote_data.is_upvote else -1
    
    if existing:
        # Update vote
        if existing.is_upvote == vote_value:
            # Same vote - remove it
            if vote_value == 1:
                report.upvotes -= 1
            else:
                report.downvotes -= 1
            db.delete(existing)
        else:
            # Change vote
            if vote_value == 1:
                report.upvotes += 1
                report.downvotes -= 1
            else:
                report.upvotes -= 1
                report.downvotes += 1
            existing.is_upvote = vote_value
    else:
        # New vote
        vote = ReportVote(
            report_id=report_id,
            user_id=current_user.id,
            is_upvote=vote_value
        )
        db.add(vote)
        if vote_value == 1:
            report.upvotes += 1
        else:
            report.downvotes += 1
    
    report.votes_count = report.upvotes - report.downvotes
    
    # Auto-verify if high votes
    if report.upvotes >= 10 and report.status == "pending":
        report.status = "verified"
    
    db.commit()
    
    return {
        "upvotes": report.upvotes,
        "downvotes": report.downvotes,
        "votes_count": report.votes_count,
        "status": report.status
    }


@router.put("/{report_id}/resolve")
def resolve_report(
    report_id: int,
    resolution_notes: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve a civic report (admin/NGO only)."""
    if not (current_user.is_admin or current_user.is_ngo):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    report = db.query(CivicReport).filter(CivicReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.status = "resolved"
    report.resolved_by_id = current_user.id
    report.resolution_notes = resolution_notes
    report.resolved_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Report resolved", "status": report.status}
