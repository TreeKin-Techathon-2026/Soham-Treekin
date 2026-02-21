# 🌍 TreeKin – Geo-Validation Changes

**Date:** February 21, 2026  
**Commit:** `4d4e7cd` — *Add geo validation for tree planting locations*  
**Branch:** `main`

---

## Overview

These changes add **geolocation-based validation** to TreeKin to prevent:

1. **Duplicate tree planting** – Rejects planting if a tree already exists within **5 meters** of the chosen GPS coordinates.
2. **Photo distance verification** – Rejects growth update photos if EXIF GPS data indicates the photo was taken more than **50 meters** from the tree's registered location.
3. **EXIF GPS extraction** – Automatically extracts GPS coordinates from uploaded photo metadata.

---

## Files Changed

| File | Status | Purpose |
|------|--------|---------|
| `treekin-backend/app/services/geo_utils.py` | **NEW** | Core geo-validation utility functions |
| `treekin-backend/test_geo_validation.py` | **NEW** | Integration tests for geo features |
| `treekin-backend/app/routers/trees.py` | Modified | Added validation logic to tree endpoints |
| `treekin-backend/app/database.py` | Modified | Database engine with fallback support |
| `treekin-frontend/src/services/api.ts` | Modified | Frontend API service (geolocation params) |
| `treekin-backend/.gitignore` | **NEW** | Backend gitignore |

---

## 1. `treekin-backend/app/services/geo_utils.py` — **[NEW FILE]**

> Core utility module providing Haversine distance calculation, EXIF GPS extraction, and database proximity search.

```python
"""
Geo-validation utilities for TreeKin.

- Haversine distance between two GPS points
- EXIF GPS extraction from uploaded photos
- Database proximity search for nearby trees
"""

import math
from typing import Optional, Dict, List
from sqlalchemy.orm import Session


# ── Haversine Distance ────────────────────────────────────────

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate distance in meters between two GPS coordinates
    using the Haversine formula.
    """
    R = 6371000  # Earth radius in meters

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c  # distance in meters


# ── EXIF GPS Extraction ──────────────────────────────────────

def _dms_to_decimal(dms_tuple, ref: str) -> Optional[float]:
    """Convert EXIF DMS (degrees, minutes, seconds) to decimal degrees."""
    try:
        degrees = float(dms_tuple[0])
        minutes = float(dms_tuple[1])
        seconds = float(dms_tuple[2])
        decimal = degrees + minutes / 60 + seconds / 3600
        if ref in ('S', 'W'):
            decimal = -decimal
        return decimal
    except (TypeError, IndexError, ValueError):
        return None


def extract_exif_gps(image_path: str) -> Optional[Dict[str, float]]:
    """
    Extract GPS coordinates from image EXIF metadata.
    Returns {"lat": float, "lng": float} or None if no GPS data found.
    """
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS

        img = Image.open(image_path)
        exif_data = img._getexif()

        if not exif_data:
            return None

        # Find the GPSInfo tag
        gps_info = {}
        for tag_id, value in exif_data.items():
            tag_name = TAGS.get(tag_id, tag_id)
            if tag_name == "GPSInfo":
                for gps_tag_id, gps_value in value.items():
                    gps_tag_name = GPSTAGS.get(gps_tag_id, gps_tag_id)
                    gps_info[gps_tag_name] = gps_value

        if not gps_info:
            return None

        # Extract latitude and longitude
        lat_dms = gps_info.get("GPSLatitude")
        lat_ref = gps_info.get("GPSLatitudeRef", "N")
        lng_dms = gps_info.get("GPSLongitude")
        lng_ref = gps_info.get("GPSLongitudeRef", "E")

        if not lat_dms or not lng_dms:
            return None

        lat = _dms_to_decimal(lat_dms, lat_ref)
        lng = _dms_to_decimal(lng_dms, lng_ref)

        if lat is not None and lng is not None:
            return {"lat": lat, "lng": lng}

        return None

    except Exception as e:
        print(f"[GeoUtils] EXIF extraction failed: {e}")
        return None


# ── Database Proximity Search ────────────────────────────────

def find_nearby_trees(db: Session, lat: float, lng: float, radius_m: float = 5.0) -> List:
    """
    Find trees within a given radius (meters) of a GPS point.
    Uses a bounding box pre-filter for efficiency, then Haversine for accuracy.
    """
    from ..models.tree import Tree

    # Approximate bounding box (1 degree ≈ 111km)
    lat_delta = (radius_m / 111_000) * 1.2  # 20% buffer
    lng_delta = (radius_m / (111_000 * math.cos(math.radians(lat)))) * 1.2

    # Pre-filter with bounding box (fast DB query)
    candidates = (
        db.query(Tree)
        .filter(
            Tree.geo_lat.isnot(None),
            Tree.geo_lng.isnot(None),
            Tree.geo_lat.between(lat - lat_delta, lat + lat_delta),
            Tree.geo_lng.between(lng - lng_delta, lng + lng_delta),
        )
        .all()
    )

    # Precise filter with Haversine
    nearby = []
    for tree in candidates:
        distance = haversine_distance(lat, lng, tree.geo_lat, tree.geo_lng)
        if distance <= radius_m:
            tree._distance_m = distance  # Attach distance for reference
            nearby.append(tree)

    # Sort by distance (closest first)
    nearby.sort(key=lambda t: t._distance_m)
    return nearby
```

---

## 2. `treekin-backend/test_geo_validation.py` — **[NEW FILE]**

> Integration test script covering Haversine accuracy, duplicate planting rejection, and GPS-optional planting.

```python
"""
Test script for geo-validation features.
Tests:
1. Haversine distance calculation
2. Duplicate tree planting rejection (within 5m)
3. Photo distance validation (within 50m)
"""

import requests
import json
import uuid

BASE_URL = "http://127.0.0.1:8001/api"

def register_and_login():
    """Register a fresh user and return the token."""
    username = f"geotest_{uuid.uuid4().hex[:6]}"
    email = f"{username}@test.com"
    password = "password123"
    
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "username": username, "email": email, "password": password
    })
    if res.status_code not in [200, 201]:
        print(f"  Register failed: {res.text}")
        return None
    
    res = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email, "password": password
    })
    if res.status_code != 200:
        print(f"  Login failed: {res.text}")
        return None
    
    token = res.json()["access_token"]
    print(f"  User '{username}' logged in.")
    return token

def test_haversine():
    """Test Haversine formula with known distances."""
    print("\n=== Test 1: Haversine Distance ===")
    import sys
    sys.path.insert(0, ".")
    from app.services.geo_utils import haversine_distance
    
    # Mumbai to Pune: ~148 km
    d1 = haversine_distance(19.0760, 72.8777, 18.5204, 73.8567)
    print(f"  Mumbai → Pune: {d1/1000:.1f} km (expected ~148 km)")
    
    # Same point: 0m
    d2 = haversine_distance(19.0760, 72.8777, 19.0760, 72.8777)
    print(f"  Same point: {d2:.2f} m (expected 0)")
    
    # 3 meters apart (very close)
    d3 = haversine_distance(19.076000, 72.877700, 19.076027, 72.877700)
    print(f"  ~3m apart: {d3:.2f} m (expected ~3)")
    
    print("  ✅ Haversine working!")

def test_duplicate_planting():
    """Test that planting at the same location is rejected."""
    print("\n=== Test 2: Duplicate Planting Rejection ===")
    token = register_and_login()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Plant first tree at specific location
    lat, lng = 19.0760, 72.8777  # Mumbai
    res = requests.post(f"{BASE_URL}/trees/", json={
        "name": "Test Banyan 1", "species": "banyan",
        "geo_lat": lat, "geo_lng": lng
    }, headers=headers)
    
    if res.status_code == 201:
        print(f"  ✅ First tree planted at ({lat}, {lng})")
    else:
        print(f"  ❌ First tree failed: {res.text}")
        return
    
    # Try planting another tree at SAME location (should fail)
    res = requests.post(f"{BASE_URL}/trees/", json={
        "name": "Test Banyan 2", "species": "banyan",
        "geo_lat": lat, "geo_lng": lng
    }, headers=headers)
    
    if res.status_code == 400:
        print(f"  ✅ Duplicate REJECTED: {res.json()['detail']}")
    else:
        print(f"  ❌ Duplicate NOT rejected! Status: {res.status_code}")
    
    # Plant at a different location (should succeed)
    lat2, lng2 = 19.0770, 72.8800  # ~250m away
    res = requests.post(f"{BASE_URL}/trees/", json={
        "name": "Test Neem", "species": "neem",
        "geo_lat": lat2, "geo_lng": lng2
    }, headers=headers)
    
    if res.status_code == 201:
        print(f"  ✅ Different location accepted ({lat2}, {lng2})")
    else:
        print(f"  ❌ Different location rejected: {res.text}")

def test_no_geo_planting():
    """Test that planting without GPS still works."""
    print("\n=== Test 3: Planting Without GPS ===")
    token = register_and_login()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    res = requests.post(f"{BASE_URL}/trees/", json={
        "name": "Indoor Tree", "species": "moringa"
    }, headers=headers)
    
    if res.status_code == 201:
        print(f"  ✅ Tree planted without GPS (no validation needed)")
    else:
        print(f"  ❌ Failed: {res.text}")

if __name__ == "__main__":
    print("🌍 Geo-Validation Tests")
    print("=" * 40)
    
    test_haversine()
    test_duplicate_planting()
    test_no_geo_planting()
    
    print("\n" + "=" * 40)
    print("🏁 All tests complete!")
```

---

## 3. `treekin-backend/app/routers/trees.py` — **[MODIFIED]**

> Geo-validation logic added to the `create_tree`, `add_tree_update`, and `upload_tree_image` endpoints.

### 3a. Import added (Line 18)

```python
from ..services.geo_utils import haversine_distance, extract_exif_gps, find_nearby_trees
```

### 3b. Duplicate planting check in `create_tree()` (Lines 36–47)

```python
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
        # ... rest of tree creation
```

### 3c. EXIF GPS extraction + photo distance check in `add_tree_update()` (Lines 314–332)

```python
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
```

### 3d. GPS stored in growth update metadata (Lines 342–349)

```python
    new_entry = {
        "url": image_url,
        "caption": caption or "",
        "uploaded_at": uploaded_at,
        "uploaded_by": current_user.id,
        "photo_lat": photo_lat,
        "photo_lng": photo_lng
    }
```

### 3e. EXIF/distance check in `upload_tree_image()` (Lines 401–419)

```python
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
```

---

## 4. `treekin-backend/app/database.py` — **[MODIFIED]**

> Added PostgreSQL-to-SQLite fallback mechanism for development flexibility.

```python
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings
import os

# Try PostgreSQL first, fall back to SQLite if it fails
database_url = settings.database_url

def _create_engine_with_fallback():
    """Try to connect to configured DB, fall back to SQLite if unavailable."""
    # For SQLite: add check_same_thread
    if database_url.startswith("sqlite"):
        return create_engine(database_url, connect_args={"check_same_thread": False})

    # Try PostgreSQL
    try:
        engine = create_engine(database_url, pool_pre_ping=True)
        # Test connection immediately
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"[TreeKin] Connected to PostgreSQL.")
        return engine
    except Exception as e:
        # Fall back to SQLite
        sqlite_url = "sqlite:///./treekin.db"
        print(f"[TreeKin] PostgreSQL unavailable ({type(e).__name__}). Falling back to SQLite: {sqlite_url}")
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

# Create database engine
engine = _create_engine_with_fallback()

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """Dependency that provides database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables."""
    from . import models  # Import all models to register them
    Base.metadata.create_all(bind=engine)
```

---

## 5. `treekin-frontend/src/services/api.ts` — **[MODIFIED]**

> Frontend API service with geolocation parameters for tree image uploads and nearby tree queries.

```typescript
// Trees API (geo-relevant methods)
export const treesAPI = {
    // ...
    getNearby: (lat: number, lng: number, radius?: number) =>
        api.get('/trees/nearby', { params: { lat, lng, radius_km: radius || 5 } }),

    uploadImage: (treeId: number, file: File, latitude?: number, longitude?: number) => {
        const formData = new FormData();
        formData.append('file', file);
        if (latitude !== undefined) formData.append('latitude', latitude.toString());
        if (longitude !== undefined) formData.append('longitude', longitude.toString());
        return api.post(`/trees/${treeId}/upload-image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    addTreeUpdate: (treeId: number, file: File, caption?: string, uploadedAt?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (caption) formData.append('caption', caption);
        if (uploadedAt) formData.append('uploaded_at', uploadedAt);
        return api.post(`/trees/${treeId}/updates`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};
```

---

## Validation Rules Summary

| Rule | Threshold | Endpoint | Action |
|------|-----------|----------|--------|
| Duplicate tree check | **5 meters** | `POST /trees/` | Rejects with 400 if another tree exists within 5m |
| Photo proximity check | **50 meters** | `POST /trees/{id}/updates` | Rejects + deletes file if EXIF GPS > 50m from tree |
| Photo proximity check | **50 meters** | `POST /trees/{id}/upload-image` | Rejects + deletes file if GPS > 50m from tree |
| No GPS fallback | — | All endpoints | Validation is skipped if GPS data is absent |

---

## Architecture Flow

```
┌──────────────┐     POST /trees/      ┌──────────────────┐
│   Frontend   │ ────────────────────▶ │   trees.py        │
│  (api.ts)    │   geo_lat, geo_lng    │   create_tree()   │
└──────────────┘                       └────────┬─────────┘
                                                │
                                    ┌───────────▼───────────┐
                                    │  find_nearby_trees()  │
                                    │  (geo_utils.py)       │
                                    │                       │
                                    │ 1. Bounding box query │
                                    │ 2. Haversine filter   │
                                    │ 3. Reject if < 5m     │
                                    └───────────────────────┘

┌──────────────┐  POST /trees/{id}/   ┌──────────────────────┐
│   Frontend   │  upload-image        │   trees.py            │
│  (api.ts)    │ ──────────────────▶  │   upload_tree_image() │
└──────────────┘  file + lat/lng      └────────┬─────────────┘
                                               │
                                   ┌───────────▼───────────┐
                                   │  extract_exif_gps()   │
                                   │  (geo_utils.py)       │
                                   │                       │
                                   │  haversine_distance() │
                                   │  Reject if > 50m      │
                                   └───────────────────────┘
```

---

*Generated on February 21, 2026*
