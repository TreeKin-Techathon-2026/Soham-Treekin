# 🌳 TreeKin — Image Verification System

A multi-layered AI + GPS verification pipeline that ensures every uploaded tree photo is **authentic**, **geolocated**, and **contains a real tree**.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                   Photo Upload Request                   │
│            (add_tree_update / upload-image)               │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Layer 1: PROXIMITY  │  ← Planting Only
              │  (create_tree)       │
              │  Radius: 5 meters    │
              │  Prevents duplicates │
              └──────────┬──────────┘
                         │ PASS
                         ▼
              ┌─────────────────────┐
              │ Layer 2: GEO-CHECK  │  ← All Uploads
              │ EXIF GPS extraction  │
              │ or frontend GPS      │
              │ Max distance: 50m    │
              └──────────┬──────────┘
                         │ PASS
                         ▼
              ┌─────────────────────┐
              │ Layer 3: AI MODEL   │  ← All Uploads
              │ google/vit-base-224  │
              │ Tree/plant detection │
              │ Cumulative scoring   │
              └──────────┬──────────┘
                         │ PASS
                         ▼
               ┌───────────────────┐
               │  ✅ Photo Stored   │
               │  with AI metadata  │
               └───────────────────┘
```

---

## Layer 1 — Proximity Duplicate Prevention

**File:** [`geo_utils.py`](treekin-backend/app/services/geo_utils.py)  
**Applied in:** `POST /api/trees/` (create_tree)

Prevents users from registering two trees at the same physical location.

### How It Works

1. User submits `geo_lat` and `geo_lng` when planting
2. System queries all existing trees within a **bounding box** (~100m)
3. Applies **Haversine formula** for precise distance calculation
4. If any tree is within **5 meters** → **REJECT** with `400`

### Haversine Formula

```python
def haversine_distance(lat1, lng1, lat2, lng2) -> float:
    """Returns distance in meters between two GPS coordinates."""
    R = 6_371_000  # Earth radius in meters
    φ1, φ2 = radians(lat1), radians(lat2)
    Δφ = radians(lat2 - lat1)
    Δλ = radians(lng2 - lng1)
    a = sin(Δφ/2)**2 + cos(φ1) * cos(φ2) * sin(Δλ/2)**2
    return R * 2 * atan2(sqrt(a), sqrt(1-a))
```

### Database Query Optimization

Instead of scanning all trees globally, we use a **bounding box pre-filter**:

```python
# Convert 100m to approximate lat/lng degrees
lat_offset = 100 / 111_320                    # ~0.0009°
lng_offset = 100 / (111_320 * cos(radians(lat)))

# Query only trees within the box
nearby = db.query(Tree).filter(
    Tree.geo_lat.between(lat - lat_offset, lat + lat_offset),
    Tree.geo_lng.between(lng - lng_offset, lng + lng_offset)
).all()
```

Then Haversine is applied only to the handful of results.

| Parameter | Value |
|-----------|-------|
| Rejection radius | **5 meters** |
| Bounding box | ~100m pre-filter |
| Skipped if | No GPS provided |

---

## Layer 2 — Photo Geolocation Validation

**File:** [`geo_utils.py`](treekin-backend/app/services/geo_utils.py)  
**Applied in:** `POST /api/trees/{id}/updates` and `POST /api/trees/{id}/upload-image`

Ensures the uploaded photo was taken **near the registered tree location**.

### GPS Data Sources (Priority Order)

| Source | Method |
|--------|--------|
| **Frontend GPS** | `latitude` / `longitude` form fields from browser Geolocation API |
| **EXIF Metadata** | `extract_exif_gps()` reads GPS from JPEG/TIFF EXIF tags via Pillow |

### EXIF GPS Extraction

```python
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def extract_exif_gps(image_path: str) -> dict | None:
    """Extract GPS coordinates from image EXIF data."""
    img = Image.open(image_path)
    exif = img._getexif()
    # Parse GPSInfo tag → convert DMS to decimal degrees
    # Returns {"lat": 19.076, "lng": 72.877} or None
```

Supports GPS data in **DMS** (degrees, minutes, seconds) and **decimal** formats.

### Distance Validation

```python
if photo_lat and photo_lng and tree.geo_lat and tree.geo_lng:
    distance = haversine_distance(photo_lat, photo_lng, tree.geo_lat, tree.geo_lng)
    if distance > 50:
        os.remove(file_path)  # Clean up saved file
        raise HTTPException(400, f"Photo taken {distance}m away. Must be within 50m.")
```

| Parameter | Value |
|-----------|-------|
| Max distance | **50 meters** |
| Fallback | If no GPS from either source → validation skipped |
| On failure | Saved file deleted, `400` returned |

---

## Layer 3 — AI Tree/Plant Detection

**File:** [`ai_validator.py`](treekin-backend/app/services/ai_validator.py)  
**Applied in:** `POST /api/trees/{id}/updates` and `POST /api/trees/{id}/upload-image`

Uses a **local AI image classifier** to determine whether the photo contains a tree or plant.

### Model Details

| Property | Value |
|----------|-------|
| Model | `google/vit-base-patch16-224` (Vision Transformer) |
| Dataset | ImageNet-1K (1000 classes) |
| Size | ~330 MB (downloaded once, cached locally) |
| Runtime | Local CPU via `transformers` + `torch` |
| Speed | ~2s per image (after initial 30s model load) |
| Internet | **Not required** after first download |
| API Key | **Not required** |

### Classification Pipeline

```python
from transformers import pipeline

classifier = pipeline(
    "image-classification",
    model="google/vit-base-patch16-224",
    device=-1  # CPU
)

results = classifier("photo.jpg", top_k=10)
# → [{"label": "oak", "score": 0.024}, {"label": "pot, flowerpot", "score": 0.017}, ...]
```

### Keyword Matching

The model returns ImageNet class labels. We match them against curated keyword sets:

**Accept Keywords** (60+ terms):
```
tree, oak, palm, pine, maple, willow, birch, cedar, banyan, neem,
plant, flower, leaf, garden, bush, hedge, shrub, sapling, seedling,
park, forest, jungle, woodland, grove, orchard, greenhouse,
pot, planter, flowerpot, coconut, mango, bamboo, ...
```

**Reject Keywords** (25+ terms):
```
monitor, screen, laptop, television, desktop, computer,
cellphone, smartphone, keyboard, mouse, remote control,
car, truck, bus, train, airplane,
pizza, hamburger, hot dog, ice cream, ...
```

### Scoring Algorithm

Since ViT distributes probability across **1000 ImageNet classes**, individual tree-related labels score low (1-5%). We use **cumulative scoring**:

```python
best_tree_score = 0.0
cumulative_tree_score = 0.0

for label in top_10_results:
    if any(keyword in label for keyword in TREE_KEYWORDS):
        cumulative_tree_score += label.score
        best_tree_score = max(best_tree_score, label.score)

# Accept if EITHER threshold is met
accepted = (best_tree_score >= 0.01) or (cumulative_tree_score >= 0.03)
```

| Threshold | Value | Purpose |
|-----------|-------|---------|
| `MIN_CONFIDENCE` | 1% | Single label minimum |
| `CUMULATIVE_TREE_THRESHOLD` | 3% | Sum of all tree labels |
| `REJECT_CONFIDENCE` | 15% | Reject keyword threshold |

### Decision Matrix

```
  Reject keyword ≥ 15%?
      ├── YES → ❌ REJECT ("Image appears to be 'laptop'")
      └── NO  → Check tree keywords
                    ├── Cumulative ≥ 3% → ✅ ACCEPT
                    ├── Single label ≥ 1% → ✅ ACCEPT
                    └── Neither → ❌ REJECT ("No tree detected")
```

### Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| Model fails to load | ✅ Accept with `"model_unavailable"` |
| Classification error | ✅ Accept with `"error"` |
| `AI_VALIDATION_ENABLED=False` | ✅ Skip validation entirely |

The system **never blocks users** due to infrastructure issues — only due to genuinely non-tree photos.

---

## Data Storage

Every validated image entry stores AI metadata in the tree's `images` JSON array:

```json
{
    "url": "/assets/trees/username/tree_1_abc123.jpg",
    "caption": "6 months growth!",
    "uploaded_at": "2026-02-21T12:00:00",
    "uploaded_by": 42,
    "photo_lat": 19.076,
    "photo_lng": 72.877,
    "ai_valid": true,
    "ai_confidence": 0.024,
    "ai_label": "lakeside, lakeshore"
}
```

---

## Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `Pillow` | EXIF GPS extraction | ≥10.0 |
| `transformers` | ViT model pipeline | ≥5.0 |
| `torch` | Model inference backend | ≥2.0 |
| `torchvision` | Image preprocessing | ≥0.25 |

---

## Configuration

In `.env`:
```env
# Feature flag — set to False to disable AI checks
AI_VALIDATION_ENABLED=True

# Optional Hugging Face token (for faster model downloads)
HF_API_TOKEN=
```

---

## API Endpoints Affected

| Endpoint | Validation Layers |
|----------|-------------------|
| `POST /api/trees/` | Layer 1 (proximity) |
| `POST /api/trees/{id}/updates` | Layer 2 (geo) + Layer 3 (AI) |
| `POST /api/trees/{id}/upload-image` | Layer 2 (geo) + Layer 3 (AI) |

---

## Test Results

| Test | Result |
|------|--------|
| Haversine: Mumbai → Pune | 120.2 km ✅ |
| Haversine: Same point | 0.0 m ✅ |
| Duplicate planting (0m) | Rejected ✅ |
| Planting 250m away | Accepted ✅ |
| Planting without GPS | Accepted (skipped) ✅ |
| Real tree photo | Accepted — "lakeside" 2.4%, cumulative 6% ✅ |
| Model unavailable | Graceful accept ✅ |
