"""
Leaderboard service layer.
Clean SQL aggregation queries for planters, adopters, and carbon leaderboards.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, case, literal, text
from ..models.user import User
from ..models.tree import Tree

# ── Carbon calculation constants ──────────────────────────────
BASE_CARBON_OFFSET_KG = 5.0   # Base carbon offset per tree (kg CO2)
GROWTH_FACTOR_KG = 0.5        # Additional carbon per growth update (kg CO2)


def _json_array_length(column):
    """
    SQLite-compatible helper to get the length of a JSON array column.
    Returns 0 for NULL or empty values.
    """
    return func.coalesce(func.json_array_length(column), 0)


def get_planters_leaderboard(db: Session, limit: int = 50):
    """
    Rank users by total trees planted.
    
    Score: total_trees_planted (count of trees where user is owner)
    Tie-breakers:
        1. Higher total growth updates
        2. Earlier account creation date
    """
    results = (
        db.query(
            User.id.label("user_id"),
            User.username,
            func.count(Tree.id).label("total_trees_planted"),
            func.coalesce(
                func.sum(_json_array_length(Tree.images)), 0
            ).label("total_growth_updates"),
        )
        .join(Tree, Tree.owner_id == User.id)
        .filter(User.is_active == True)
        .group_by(User.id, User.username)
        .order_by(
            func.count(Tree.id).desc(),                                    # Primary: most trees
            func.coalesce(func.sum(_json_array_length(Tree.images)), 0).desc(),  # Tie-break 1: most updates
            User.created_at.asc(),                                         # Tie-break 2: earliest signup
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "user_id": row.user_id,
            "username": row.username,
            "total_trees_planted": row.total_trees_planted,
            "total_growth_updates": row.total_growth_updates,
            "rank": idx + 1,
        }
        for idx, row in enumerate(results)
    ]


def get_adopters_leaderboard(db: Session, limit: int = 50):
    """
    Rank users by adoption engagement.
    
    Score: (total_trees_adopted * 10) + (total_credits_spent * 0.5)
    
    Note: total_credits_spent is currently 0.0 because the adoption flow
    does not yet deduct credits. The formula is future-proofed for when
    credit spending is implemented.
    """
    # Count trees where user is the adopter
    results = (
        db.query(
            User.id.label("user_id"),
            User.username,
            func.count(Tree.id).label("total_trees_adopted"),
        )
        .join(Tree, Tree.adopter_id == User.id)
        .filter(User.is_active == True)
        .group_by(User.id, User.username)
        .order_by(
            func.count(Tree.id).desc(),   # Primary: most adoptions
            User.created_at.asc(),         # Tie-break: earliest signup
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "user_id": row.user_id,
            "username": row.username,
            "total_trees_adopted": row.total_trees_adopted,
            "total_credits_spent": 0.0,  # Placeholder until credit-deduction is built
            "adoption_score": round((row.total_trees_adopted * 10) + (0.0 * 0.5), 2),
            "rank": idx + 1,
        }
        for idx, row in enumerate(results)
    ]


def get_carbon_leaderboard(db: Session, limit: int = 50):
    """
    Rank users by total carbon offset.
    
    Per-tree carbon:
        carbon_offset = BASE_CARBON_OFFSET_KG + (growth_updates * GROWTH_FACTOR_KG)
    
    User score: SUM(carbon_offset) over all trees owned by user.
    """
    # Compute per-tree carbon offset inline, then SUM per user
    per_tree_carbon = (
        BASE_CARBON_OFFSET_KG
        + _json_array_length(Tree.images) * GROWTH_FACTOR_KG
    )

    results = (
        db.query(
            User.id.label("user_id"),
            User.username,
            func.coalesce(
                func.sum(per_tree_carbon), 0.0
            ).label("total_carbon_offset"),
            func.count(Tree.id).label("total_trees"),
        )
        .join(Tree, Tree.owner_id == User.id)
        .filter(User.is_active == True)
        .group_by(User.id, User.username)
        .order_by(
            func.sum(per_tree_carbon).desc(),  # Primary: highest carbon
            func.count(Tree.id).desc(),         # Tie-break 1: most trees
            User.created_at.asc(),              # Tie-break 2: earliest signup
        )
        .limit(limit)
        .all()
    )

    return [
        {
            "user_id": row.user_id,
            "username": row.username,
            "total_carbon_offset": round(float(row.total_carbon_offset), 2),
            "total_trees": row.total_trees,
            "rank": idx + 1,
        }
        for idx, row in enumerate(results)
    ]
