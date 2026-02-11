from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import uuid
import shutil
from ..database import get_db
from ..models.user import User
from ..models.tree import Tree, TreeEvent
from ..schemas.tree import (
    TreeCreate, TreeUpdate, TreeResponse,
    TreeAdoptRequest, TreeEventCreate, TreeEventResponse
)
from ..services.auth_utils import get_current_user

# Save uploads to frontend public folder so Vite serves them directly
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "..", "treekin-frontend", "public", "assets", "trees")
UPLOADS_DIR = FRONTEND_DIR
os.makedirs(UPLOADS_DIR, exist_ok=True)

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


@router.post("/{tree_id}/upload-image")
def upload_tree_image(
    tree_id: int,
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload an image for a tree with optional geolocation."""
    # Verify tree exists and user owns it
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    if tree.owner_id != current_user.id and tree.adopter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to upload to this tree")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, WebP, GIF) allowed")
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"tree_{tree_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(UPLOADS_DIR, unique_filename)
    
    # Save file to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")
    
    # Generate URL for the image (served by Vite from public/assets/trees/)
    image_url = f"/assets/trees/{unique_filename}"
    
    # Update tree record
    if not tree.main_image_url:
        tree.main_image_url = image_url
    
    # Add to images array
    current_images = tree.images or []
    current_images.append({
        "url": image_url,
        "latitude": latitude,
        "longitude": longitude,
        "uploaded_at": datetime.utcnow().isoformat(),
        "uploaded_by": current_user.id
    })
    tree.images = current_images
    
    # Update geolocation if provided and not already set
    if latitude and longitude:
        if not tree.geo_lat or not tree.geo_lng:
            tree.geo_lat = latitude
            tree.geo_lng = longitude
    
    db.commit()
    db.refresh(tree)
    
    return {
        "success": True,
        "message": "Image uploaded successfully",
        "image_url": image_url,
        "tree_id": tree_id,
        "total_images": len(current_images)
    }
