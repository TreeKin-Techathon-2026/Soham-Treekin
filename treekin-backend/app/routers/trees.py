from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.tree import Tree, TreeEvent
from ..schemas.tree import (
    TreeCreate, TreeUpdate, TreeResponse,
    TreeAdoptRequest, TreeEventCreate, TreeEventResponse
)
from ..services.auth_utils import get_current_user

router = APIRouter(prefix="/trees", tags=["Trees"])


@router.post("/", response_model=TreeResponse, status_code=status.HTTP_201_CREATED)
def create_tree(
    tree_data: TreeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Plant a new tree."""
    try:
        # Exclude alias fields and fields not in Tree model
        tree_dict = tree_data.model_dump(exclude={'latitude', 'longitude', 'event_description'})
        tree = Tree(
            **tree_dict,
            owner_id=current_user.id,
            status="planted"
        )
        db.add(tree)
        
        # Update user stats
        current_user.trees_planted += 1
        
        db.commit()
        db.refresh(tree)
        return tree
    except Exception as e:
        import traceback
        print(f"ERROR creating tree: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[TreeResponse])
def list_trees(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    owner_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List trees with optional filters."""
    query = db.query(Tree)
    
    if status:
        query = query.filter(Tree.status == status)
    if event_type:
        query = query.filter(Tree.event_type == event_type)
    if owner_id:
        query = query.filter(Tree.owner_id == owner_id)
    
    trees = query.order_by(Tree.created_at.desc()).offset(skip).limit(limit).all()
    return trees


@router.get("/my", response_model=List[TreeResponse])
def get_my_trees(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trees owned or adopted by current user."""
    trees = db.query(Tree).filter(
        (Tree.owner_id == current_user.id) | (Tree.adopter_id == current_user.id)
    ).all()
    return trees


@router.get("/{tree_id}", response_model=TreeResponse)
def get_tree(tree_id: int, db: Session = Depends(get_db)):
    """Get tree by ID."""
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    return tree


@router.put("/{tree_id}", response_model=TreeResponse)
def update_tree(
    tree_id: int,
    update_data: TreeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update tree details."""
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    if tree.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this tree")
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(tree, field, value)
    
    db.commit()
    db.refresh(tree)
    return tree


@router.post("/adopt", response_model=TreeResponse)
def adopt_tree(
    request: TreeAdoptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adopt a tree."""
    tree = db.query(Tree).filter(Tree.id == request.tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    if tree.adopter_id:
        raise HTTPException(status_code=400, detail="Tree already adopted")
    
    if tree.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot adopt your own tree")
    
    tree.adopter_id = current_user.id
    tree.status = "adopted"
    current_user.trees_adopted += 1
    
    db.commit()
    db.refresh(tree)
    return tree


@router.post("/{tree_id}/events", response_model=TreeEventResponse)
def add_tree_event(
    tree_id: int,
    event_data: TreeEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add an event/milestone to a tree."""
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    if tree.owner_id != current_user.id and tree.adopter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    event = TreeEvent(
        tree_id=tree_id,
        event_name=event_data.event_name,
        event_description=event_data.event_description,
        event_date=event_data.event_date or datetime.utcnow(),
        event_data=event_data.event_data
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{tree_id}/events", response_model=List[TreeEventResponse])
def get_tree_events(tree_id: int, db: Session = Depends(get_db)):
    """Get all events for a tree."""
    events = db.query(TreeEvent).filter(TreeEvent.tree_id == tree_id).order_by(TreeEvent.created_at.desc()).all()
    return events


@router.get("/nearby")
def get_nearby_trees(
    lat: float,
    lng: float,
    radius_km: float = 5,
    db: Session = Depends(get_db)
):
    """Get trees near a location (simplified - uses bounding box)."""
    # Approximate 1 degree = 111km
    lat_delta = radius_km / 111
    lng_delta = radius_km / (111 * 0.85)  # Approximate for mid-latitudes
    
    trees = db.query(Tree).filter(
        Tree.geo_lat.between(lat - lat_delta, lat + lat_delta),
        Tree.geo_lng.between(lng - lng_delta, lng + lng_delta)
    ).all()
    
    return [
        {
            "id": t.id,
            "name": t.name,
            "lat": t.geo_lat,
            "lng": t.geo_lng,
            "species": t.species,
            "status": t.status
        }
        for t in trees
    ]
