"""Test new HF Inference API with router endpoint and with huggingface_hub."""
import requests
import os

# Find test image
uploads_dir = os.path.join("..", "treekin-frontend", "public", "assets", "trees")
test_image = None
for root, dirs, files in os.walk(uploads_dir):
    for f in files:
        if f.endswith((".jpg", ".jpeg", ".png", ".webp")):
            test_image = os.path.join(root, f)
            break
    if test_image:
        break

with open(test_image, "rb") as f:
    image_bytes = f.read()

# Try the new router endpoint
print("=== Testing new /router API ===")
url = "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224"
res = requests.post(url, data=image_bytes, timeout=15)
print(f"Router API: status={res.status_code}")
if res.status_code == 200:
    data = res.json()
    if isinstance(data, list) and len(data) > 0:
        print(f"  TOP: {data[0].get('label', '?')} = {data[0].get('score', 0):.2%}")
else:
    print(f"  {res.text[:200]}")

# Try the new Inference API endpoint
print("\n=== Testing api-inference (POST with Content-Type) ===")
url2 = "https://api-inference.huggingface.co/models/google/vit-base-patch16-224"
headers = {"Content-Type": "application/octet-stream"}
res2 = requests.post(url2, data=image_bytes, headers=headers, timeout=15)
print(f"API inference: status={res2.status_code}")
if res2.status_code == 200:
    data = res2.json()
    if isinstance(data, list) and len(data) > 0:
        print(f"  TOP: {data[0].get('label', '?')} = {data[0].get('score', 0):.2%}")
else:
    print(f"  {res2.text[:200]}")
