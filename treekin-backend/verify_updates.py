import requests
import json
import uuid

BASE_URL = "http://127.0.0.1:8000/api"

def run_test():
    # 1. Register/Login
    username = f"user_{uuid.uuid4().hex[:8]}"
    password = "password123"
    email = f"{username}@example.com"
    
    print(f" registering user: {username}")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    if res.status_code not in [200, 201]:
        print(f"Registration failed: {res.text}")
        return

    res = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": password
    })
    if res.status_code != 200:
        print(f"Login failed: {res.text}")
        return
    
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(" logged in.")

    # 2. Plant a tree
    print(" planting a tree...")
    tree_data = {
        "name": "Update Test Tree",
        "species": "Oak",
        "geo_lat": 45.0,
        "geo_lng": -122.0
    }
    res = requests.post(f"{BASE_URL}/trees/", json=tree_data, headers=headers)
    if res.status_code not in [200, 201]:
        print(f"Planting failed: {res.text}")
        return
    
    tree_id = res.json()["id"]
    print(f" tree planted with ID: {tree_id}")

    # 3. Upload update (image)
    # create a dummy image file
    with open("dummy_update.jpg", "wb") as f:
        f.write(b"fake image data")

    print(" uploading update...")
    files = {"file": ("dummy_update.jpg", open("dummy_update.jpg", "rb"), "image/jpeg")}
    res = requests.post(f"{BASE_URL}/trees/{tree_id}/upload-image", headers=headers, files=files)
    if res.status_code != 200:
        print(f"Upload failed: {res.text}")
        return
    print(" update uploaded.")

    # 4. Fetch updates
    print(" fetching updates...")
    res = requests.get(f"{BASE_URL}/trees/{tree_id}/updates", headers=headers)
    if res.status_code != 200:
        print(f"Fetch updates failed: {res.text}")
        return
    
    updates = res.json()
    print(f" updates retrieved: {updates}")
    print(json.dumps(updates, indent=2))
    
    if len(updates) > 0 and "caption" in updates[0]:
        print(" SUCCESS: Update found correctly!")
    else:
        print(" FAILURE: No updates found or missing caption.")

if __name__ == "__main__":
    run_test()
