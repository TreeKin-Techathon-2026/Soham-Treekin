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
