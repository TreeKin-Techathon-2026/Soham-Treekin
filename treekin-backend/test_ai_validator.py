"""Test the local AI validator with a real image."""
import os
import sys
from app.services.ai_validator import validate_tree_photo

# Find any existing tree image
uploads_dir = os.path.join("..", "treekin-frontend", "public", "assets", "trees")
test_image = None
for root, dirs, files in os.walk(uploads_dir):
    for f in files:
        if f.endswith((".jpg", ".jpeg", ".png", ".webp")):
            test_image = os.path.join(root, f)
            break
    if test_image:
        break

if not test_image:
    from PIL import Image
    img = Image.new("RGB", (224, 224), color=(34, 139, 34))
    test_image = "test_green.jpg"
    img.save(test_image)
    print("Using generated green test image")

print(f"Testing: {os.path.basename(test_image)}")
print("Loading model (first time may take 30s)...")
result = validate_tree_photo(test_image)
print(f"\nResult:")
print(f"  Valid: {result['valid']}")
print(f"  Confidence: {result['confidence']}")
print(f"  Label: {result['label']}")
print(f"  Reason: {result['reason']}")
if result.get("all_labels"):
    print(f"\n  Top labels:")
    for l in result["all_labels"][:5]:
        print(f"    {l['label']}: {l['score']}")

# Cleanup
if os.path.basename(test_image) == "test_green.jpg":
    os.remove(test_image)

print("\nDone!")
