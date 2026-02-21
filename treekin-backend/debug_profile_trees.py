import requests
import json

BASE_URL = "http://127.0.0.1:8000/api"

# Login to get token
def login():
    try:
        response = requests.post(f"{BASE_URL}/auth/login", data={
            "username": "tester@example.com", 
            "password": "password123"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        print(f"Login failed: {response.text}")
        return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def check_my_trees(token):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        print(f"Requesting {BASE_URL}/trees/my...")
        response = requests.get(f"{BASE_URL}/trees/my", headers=headers)
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            trees = response.json()
            print(f"Tree Count: {len(trees)}")
            if len(trees) > 0:
                print("First Tree Sample:")
                print(json.dumps(trees[0], indent=2))
            else:
                print("No trees found.")
        else:
            print("Error Response:")
            print(response.text)
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    token = login()
    if token:
        check_my_trees(token)
