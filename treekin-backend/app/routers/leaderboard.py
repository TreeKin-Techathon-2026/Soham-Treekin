from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.user import User
from ..models.tree import Tree
from ..services.leaderboard_service import (
    get_planters_leaderboard,
    get_adopters_leaderboard,
    get_carbon_leaderboard,
)

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


# ── New aggregation-based leaderboards ────────────────────────


@router.get("/planters")
def leaderboard_planters(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Rank users by total trees planted.
    Tie-break: most growth updates → earliest account creation.
    """
    return get_planters_leaderboard(db, limit)


@router.get("/adopters")
def leaderboard_adopters(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Rank users by adoption engagement score.
    Score = (trees_adopted * 10) + (credits_spent * 0.5)
    """
    return get_adopters_leaderboard(db, limit)


@router.get("/carbon")
def leaderboard_carbon(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """
    Rank users by total carbon offset (kg CO2).
    Per-tree: base_carbon + (growth_updates * growth_factor)
    """
    return get_carbon_leaderboard(db, limit)


# ── Unchanged endpoints ──────────────────────────────────────


@router.get("/top-tredits")
def get_top_tredits(
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get users with most TREDITS."""
    users = db.query(User).filter(
        User.is_active == True
    ).order_by(User.tredits_balance.desc()).limit(limit).all()
    
    return [
        {
            "rank": i + 1,
            "user_id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "avatar_url": u.avatar_url,
            "tredits_balance": u.tredits_balance,
            "is_verified": u.is_verified
        }
        for i, u in enumerate(users)
    ]


@router.get("/stats")
def get_platform_stats(db: Session = Depends(get_db)):
    """Get overall platform statistics."""
    total_users = db.query(func.count(User.id)).scalar()
    total_trees = db.query(func.count(Tree.id)).scalar()
    total_carbon = db.query(func.sum(User.total_carbon_saved)).scalar() or 0
    total_tredits = db.query(func.sum(User.tredits_balance)).scalar() or 0
    
    trees_by_status = db.query(
        Tree.status,
        func.count(Tree.id)
    ).group_by(Tree.status).all()
    
    trees_by_event = db.query(
        Tree.event_type,
        func.count(Tree.id)
    ).group_by(Tree.event_type).all()
    
    return {
        "total_users": total_users,
        "total_trees": total_trees,
        "total_carbon_saved_kg": round(total_carbon, 2),
        "total_tredits_circulating": round(total_tredits, 2),
        "trees_by_status": {s: c for s, c in trees_by_status},
        "trees_by_event_type": {e: c for e, c in trees_by_event}
    }
