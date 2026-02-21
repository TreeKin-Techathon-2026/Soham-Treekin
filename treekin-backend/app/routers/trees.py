from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import uuid
import shutil
from ..database import get_db
from sqlalchemy.orm.attributes import flag_modified
from ..models.user import User
from ..models.tree import Tree, TreeEvent
from ..schemas.tree import (
    TreeCreate, TreeUpdate, TreeResponse,
    TreeAdoptRequest, TreeEventCreate, TreeEventResponse
)
from ..models.post import Post  # Import Post model
from ..services.auth_utils import get_current_user
from ..services.geo_utils import haversine_distance, extract_exif_gps, find_nearby_trees

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
        # Geo-validation: Check if a tree already exists within 5 meters
        if tree_data.geo_lat and tree_data.geo_lng:
            nearby = find_nearby_trees(db, tree_data.geo_lat, tree_data.geo_lng, radius_m=5.0)
            if nearby:
                existing = nearby[0]
                dist = int(existing._distance_m)
                raise HTTPException(
                    status_code=400,
                    detail=f"A tree already exists within {dist}m of this location "
                           f"(Tree #{existing.id}: '{existing.name}'). "
                           f"Choose a different spot or adopt the existing tree."
                )

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


@router.get("/{tree_id}/updates")
def get_tree_updates(tree_id: int, db: Session = Depends(get_db)):
    """Get all growth update photos for a tree."""
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")

    images = tree.images or []
    updates = []
    for i, img in enumerate(images):
        if isinstance(img, dict):
            updates.append({
                "image_url": img.get("url", ""),
                "caption": img.get("caption", f"Growth update #{i + 1}"),
                "uploaded_at": img.get("uploaded_at", ""),
            })
        elif isinstance(img, str):
            updates.append({
                "image_url": img,
                "caption": f"Growth update #{i + 1}",
                "uploaded_at": "",
            })

    # Most recent first
    updates.reverse()
    return updates


@router.post("/{tree_id}/updates")
def add_tree_update(
    tree_id: int,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    uploaded_at: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a growth update (photo + caption + date) to a tree."""
    # Verify tree exists and user owns/adopted it
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")

    if tree.owner_id != current_user.id and tree.adopter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to add updates to this tree")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only image files (JPEG, PNG, WebP, GIF) allowed")

    # Validate uploaded_at date (cannot be in the future)
    if uploaded_at:
        try:
            parsed_date = datetime.fromisoformat(uploaded_at.replace("Z", "+00:00"))
            if parsed_date.tzinfo:
                compare_dt = datetime.now(parsed_date.tzinfo)
            else:
                compare_dt = datetime.utcnow()
            if parsed_date > compare_dt:
                raise HTTPException(status_code=400, detail="Date cannot be in the future")
        except ValueError:
            # Try simpler date format (YYYY-MM-DD)
            try:
                parsed_date = datetime.strptime(uploaded_at, "%Y-%m-%d")
                if parsed_date.date() > datetime.utcnow().date():
                    raise HTTPException(status_code=400, detail="Date cannot be in the future")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format")
    else:
        uploaded_at = datetime.utcnow().isoformat()

    # Generate unique filename and save
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"tree_{tree_id}_{uuid.uuid4().hex}{file_ext}"
    user_folder = os.path.join(UPLOADS_DIR, current_user.username)
    os.makedirs(user_folder, exist_ok=True)
    file_path = os.path.join(user_folder, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")

    # Geo-validation: Extract GPS from EXIF if not provided by frontend
    photo_lat = None
    photo_lng = None
    exif_gps = extract_exif_gps(file_path)
    if exif_gps:
        photo_lat = exif_gps["lat"]
        photo_lng = exif_gps["lng"]

    # Validate photo was taken near the tree (within 50m)
    if photo_lat and photo_lng and tree.geo_lat and tree.geo_lng:
        distance = haversine_distance(photo_lat, photo_lng, tree.geo_lat, tree.geo_lng)
        if distance > 50:
            # Remove the saved file since it's invalid
            os.remove(file_path)
            raise HTTPException(
                status_code=400,
                detail=f"Photo was taken {int(distance)}m from the tree. "
                       f"Must be within 50m to verify you're near your tree."
            )

    image_url = f"/assets/trees/{current_user.username}/{unique_filename}"

    # Set as main image if tree has none
    if not tree.main_image_url:
        tree.main_image_url = image_url

    # Append to images JSON array
    current_images = tree.images or []
    new_entry = {
        "url": image_url,
        "caption": caption or "",
        "uploaded_at": uploaded_at,
        "uploaded_by": current_user.id,
        "photo_lat": photo_lat,
        "photo_lng": photo_lng
    }
    current_images.append(new_entry)
    tree.images = current_images
    flag_modified(tree, "images")

    db.commit()
    db.refresh(tree)

    return {
        "image_url": image_url,
        "caption": caption or "",
        "uploaded_at": uploaded_at
    }


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
    
    # Generate unique filename and save in per-username folder
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    unique_filename = f"tree_{tree_id}_{uuid.uuid4().hex}{file_ext}"
    user_folder = os.path.join(UPLOADS_DIR, current_user.username)
    os.makedirs(user_folder, exist_ok=True)
    file_path = os.path.join(user_folder, unique_filename)
    
    # Save file to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")
    
    # Geo-validation: Extract GPS from EXIF if not provided by frontend
    photo_lat = latitude
    photo_lng = longitude
    if not photo_lat or not photo_lng:
        exif_gps = extract_exif_gps(file_path)
        if exif_gps:
            photo_lat = exif_gps["lat"]
            photo_lng = exif_gps["lng"]
    
    # Validate photo was taken near the tree (within 50m)
    if photo_lat and photo_lng and tree.geo_lat and tree.geo_lng:
        distance = haversine_distance(photo_lat, photo_lng, tree.geo_lat, tree.geo_lng)
        if distance > 50:
            os.remove(file_path)
            raise HTTPException(
                status_code=400,
                detail=f"Photo was taken {int(distance)}m from the tree. "
                       f"Must be within 50m to verify you're near your tree."
            )
    
    # Generate URL for the image (served by Vite from public/assets/trees/{username}/)
    image_url = f"/assets/trees/{current_user.username}/{unique_filename}"
    
    # Update tree record
    if not tree.main_image_url:
        tree.main_image_url = image_url
    
    # Add to images array
    current_images = tree.images or []
    current_images.append({
        "url": image_url,
        "latitude": photo_lat,
        "longitude": photo_lng,
        "uploaded_at": datetime.utcnow().isoformat(),
        "uploaded_by": current_user.id
    })
    tree.images = current_images
    flag_modified(tree, "images")
    
    # Auto-create a social post for this upload
    try:
        new_post = Post(
            tree_id=tree_id,
            user_id=current_user.id,
            content=f"Just planted a new {tree.species or 'tree'}! 🌳 Check it out!",
            media_urls=[image_url]  # Add the image to the post
        )
        db.add(new_post)
        # Commit will happen with the tree update
    except Exception as e:
        print(f"Error creating auto-post: {e}")
        # Don't fail the upload if post creation fails
    
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
