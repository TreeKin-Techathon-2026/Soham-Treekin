# TreeKin — Unpushed Code Changes

> Changes from **Session 3** (Feb 12 — Profile Page Tree Updates) and **Session 4** (Feb 13 — Bug Fixes).

---

## Table of Contents

- [Session 3: Profile Page Tree Updates (Feb 12)](#session-3-profile-page-tree-updates-feb-12)
- [Session 4: Bug Fixes — Registration & Profile (Feb 13)](#session-4-bug-fixes--registration--profile-feb-13)
- [Files Changed Summary](#files-changed-summary)

---

## Session 3: Profile Page Tree Updates (Feb 12)

**Goal**: Replace static category tabs with a dynamic tree selector and growth photo gallery on the Profile page.

---

### `treekin-backend/app/routers/trees.py` — New Endpoint

**Added** `GET /trees/{tree_id}/updates` — returns growth update photos from a tree's `images` JSON field:

```python
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
```

---

### `treekin-frontend/src/services/api.ts` — API Method

**Added** to `treesAPI` object:

```typescript
getTreeUpdates: (treeId: number) => api.get(`/trees/${treeId}/updates`),
```

---

### `treekin-frontend/src/pages/Profile/Profile.tsx` — Major Rewrite of Tree Collection Section

#### Removed:
- `TREE_CATEGORIES` array (`['All', 'Birth', 'Memorial', 'Achievement', 'Couple']`)
- `MOCK_TREE_CARDS` array (4 hardcoded mock trees with fake stats)
- `activeCategory` state and category filter tabs UI
- Old tree card grid with `Heart`, `MessageCircle`, `Share2` action buttons
- Unused imports: `Heart`, `MessageCircle`, `Share2`, `Shield`, `Trophy`, `Target`

#### Added:

**New interface:**
```tsx
interface TreeUpdateData {
    image_url: string;
    caption: string;
    uploaded_at: string;
}
```

**New state variables:**
```tsx
const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
const [treeUpdates, setTreeUpdates] = useState<TreeUpdateData[]>([]);
const [updatesLoading, setUpdatesLoading] = useState(false);
const [fadeKey, setFadeKey] = useState(0);
```

**Fetch tree updates function:**
```tsx
const fetchUpdates = async () => {
    setUpdatesLoading(true);
    try {
        const res = await treesAPI.getTreeUpdates(selectedTreeId);
        setTreeUpdates(res.data);
    } catch (err) {
        console.error('Failed to fetch tree updates:', err);
        setTreeUpdates([]);
    } finally {
        setUpdatesLoading(false);
    }
};
```

**Auto-select first tree on load:**
```tsx
useEffect(() => {
    if (myTrees.length > 0 && selectedTreeId === null) {
        setSelectedTreeId(myTrees[0].id);
    }
}, [myTrees]);
```

**Tree selection handler (with fade animation):**
```tsx
const handleTreeSelect = (treeId: number) => {
    if (treeId === selectedTreeId) return;
    setFadeKey(prev => prev + 1);
    setSelectedTreeId(treeId);
};

const formatUpdateDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
};
```

**New JSX — tree name pills + updates gallery:**
- Horizontal scrollable tree-name pill buttons showing `🌳 {tree.name}`
- Tree updates photo gallery grid with image cards, captions, and dates
- Empty states: "No trees planted yet", "No growth updates yet", "Plant your first tree"

---

### `treekin-frontend/src/pages/Profile/Profile.css` — Style Changes

#### Removed:
- `.tree-tabs` / `.tree-tab` styles (old category filter tabs)

#### Added:
| Class | Purpose |
|-------|---------|
| `.tree-selector-pills` | Horizontal scrollable container for tree name pills |
| `.tree-pill` / `.tree-pill.active` | Individual pill buttons, green active state |
| `.tree-updates-section` | Section wrapper with fade-in animation |
| `.tree-updates-grid` | Responsive photo grid (3→2→1 columns) |
| `.tree-update-card` | Individual photo card with hover effects |
| `.tree-updates-empty` | Empty state message styling |
| `.tree-updates-loading` | Loading spinner state |
| `@keyframes spin-icon` | Spinner rotation animation |
| `@keyframes updatesFadeIn` | Fade animation on tree switch |

---

## Session 4: Bug Fixes — Registration & Profile (Feb 13)

**Goal**: Fix "registration failed" error and trees not showing on Profile page.

---

### Fix 1: Schema Type Mismatch (Root Cause of Trees Not Showing)

#### `treekin-backend/app/schemas/tree.py`

```diff
- images: List[str] = []
+ images: Optional[List[Any]] = []
```

**Why**: The DB stores images as `List[dict]` (with `url`, `latitude`, `uploaded_at`, etc.) but the schema expected `List[str]`, causing Pydantic validation to fail on `/trees/my` — silently breaking the entire profile tree display. **Any tree with uploaded images caused ALL trees to disappear.**

**Full current `TreeResponse` schema:**
```python
class TreeResponse(TreeBase):
    id: int
    owner_id: int
    adopter_id: Optional[int] = None
    sponsor_id: Optional[int] = None
    status: str
    health_status: str
    event_type: str
    event_data: Optional[dict] = None
    height_cm: Optional[float] = None
    age_months: Optional[int] = None
    planted_date: Optional[datetime] = None
    carbon_credits: float = 0.0
    total_tredits_earned: float = 0.0
    main_image_url: Optional[str] = None
    images: Optional[List[Any]] = []   # ← Fixed from List[str]
    created_at: datetime

    class Config:
        from_attributes = True
```

---

### Fix 2: Route Ordering

#### `treekin-backend/app/routers/trees.py`

Moved `GET /trees/nearby` **before** `GET /trees/{tree_id}` to prevent FastAPI route conflict. FastAPI matches routes in definition order, so `nearby` was being caught by `{tree_id}` first.

**Current route order:**
1. `POST /trees/` — create_tree
2. `GET /trees/` — list_trees
3. `GET /trees/my` — get_my_trees
4. `GET /trees/nearby` — get_nearby_trees ← **Moved up**
5. `GET /trees/{tree_id}` — get_tree
6. `PUT /trees/{tree_id}` — update_tree
7. `POST /trees/adopt` — adopt_tree
8. `POST /trees/{tree_id}/events` — add_tree_event
9. `GET /trees/{tree_id}/events` — get_tree_events
10. `GET /trees/{tree_id}/updates` — get_tree_updates
11. `POST /trees/{tree_id}/upload-image` — upload_tree_image

---

### Fix 3: Resilient API Loading

#### `treekin-frontend/src/pages/Profile/Profile.tsx`

Changed from `Promise.all` to `Promise.allSettled` so one failing API call doesn't break the entire profile:

```diff
  const loadProfileData = async () => {
      try {
-         const [walletRes, treesRes, postsRes] = await Promise.all([
+         const [walletRes, treesRes, postsRes] = await Promise.allSettled([
              carbonAPI.getWallet(),
              treesAPI.getMyTrees(),
              postsAPI.list({ limit: 20 } as any),
          ]);
-         setWallet(walletRes.data);
-         setMyTrees(treesRes.data);
+         if (walletRes.status === 'fulfilled') setWallet(walletRes.value.data);
+         else console.error('Failed to load wallet:', walletRes.reason);
+
+         if (treesRes.status === 'fulfilled') setMyTrees(treesRes.value.data);
+         else console.error('Failed to load trees:', treesRes.reason);
+
+         if (postsRes.status === 'fulfilled') {
+             const userPosts = postsRes.value.data.filter(
+                 (p: any) => p.user_id === user?.id
+             );
+             setMyPosts(userPosts);
+         } else {
+             console.error('Failed to load posts:', postsRes.reason);
+         }
      } catch (error) {
          console.error('Failed to load profile data:', error);
      }
  };
```

---

### Fix 4: Backend Startup (Environment)

The `uvicorn` executable was in a different Python environment than `python`, causing `ModuleNotFoundError: No module named 'jose'`.

```diff
- uvicorn app.main:app --reload               # ❌ wrong env
+ python -m uvicorn app.main:app --reload      # ✅ correct
```

---

## Files Changed Summary

| File | Session | Change Type |
|------|---------|-------------|
| `treekin-backend/app/routers/trees.py` | 3, 4 | New `/updates` endpoint + route reorder |
| `treekin-backend/app/schemas/tree.py` | 4 | `images` field type fix (`List[str]` → `Optional[List[Any]]`) |
| `treekin-frontend/src/services/api.ts` | 3 | Added `getTreeUpdates` method |
| `treekin-frontend/src/pages/Profile/Profile.tsx` | 3, 4 | Tree selector rewrite + `Promise.allSettled` fix |
| `treekin-frontend/src/pages/Profile/Profile.css` | 3 | New tree pills + updates gallery styles |
| `treekin-backend/treekin.db` | 3, 4 | Data changes (binary) |
