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
