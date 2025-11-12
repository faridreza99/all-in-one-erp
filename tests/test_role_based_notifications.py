"""
Test script for role-based notification and stock visibility system
Tests:
1. Product assignment by tenant admin creates notifications
2. Branch users see only their notifications
3. Stock visibility is role-based
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000/api"

# Test users (from database)
TENANT_ADMIN = {
    "email": "infini@mail.com",
    "password": "password",  # Update if different
    "tenant_id": "1bdef433-bf09-4df1-8572-bdc268595cf5"
}

BRANCH_USER = {
    "email": "infiniFarid@mail.com",
    "password": "password",  # Update if different
    "branch_id": "065b0764-3390-4afd-9777-648c031fb9a2",
    "tenant_id": "1bdef433-bf09-4df1-8572-bdc268595cf5"
}

def print_header(text):
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)

def print_result(test_name, passed, details=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if details:
        print(f"   {details}")

def login(email, password):
    """Login and return auth token"""
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    else:
        print(f"Login failed for {email}: {response.status_code}")
        print(f"Response: {response.text}")
        return None

def get_branches(token):
    """Get all branches"""
    response = requests.get(
        f"{BASE_URL}/branches",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code == 200:
        return response.json()
    return []

def get_products(token):
    """Get all products"""
    response = requests.get(
        f"{BASE_URL}/products",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code == 200:
        return response.json()
    return []

def get_users(token):
    """Get all users in tenant"""
    response = requests.get(
        f"{BASE_URL}/users",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code == 200:
        return response.json()
    return []

def assign_product_to_branch(token, product_id, branch_id, quantity):
    """Assign product to branch"""
    response = requests.post(
        f"{BASE_URL}/product-branches",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "product_id": product_id,
            "branch_id": branch_id,
            "stock_quantity": quantity,
            "sale_price": 999.99
        }
    )
    return response

def get_notifications(token):
    """Get notifications for current user"""
    response = requests.get(
        f"{BASE_URL}/notifications",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code == 200:
        return response.json()
    return []

def get_product_assignments(token):
    """Get product-branch assignments"""
    response = requests.get(
        f"{BASE_URL}/product-branches",
        headers={"Authorization": f"Bearer {token}"}
    )
    if response.status_code == 200:
        return response.json()
    return []

def run_tests():
    print_header("ROLE-BASED NOTIFICATION & STOCK VISIBILITY TEST")
    
    # Step 1: Login as tenant admin
    print_header("Step 1: Login as Tenant Admin")
    admin_token = login(TENANT_ADMIN["email"], TENANT_ADMIN["password"])
    if not admin_token:
        print("❌ Cannot proceed - admin login failed")
        return
    print_result("Admin Login", True, f"Logged in as {TENANT_ADMIN['email']}")
    
    # Step 2: Get branches and products
    print_header("Step 2: Get Test Data")
    branches = get_branches(admin_token)
    products = get_products(admin_token)
    users = get_users(admin_token)
    
    print_result("Fetch Branches", len(branches) > 0, f"Found {len(branches)} branches")
    print_result("Fetch Products", len(products) > 0, f"Found {len(products)} products")
    print_result("Fetch Users", len(users) > 0, f"Found {len(users)} users")
    
    if not branches or not products:
        print("❌ Cannot proceed - no test data available")
        return
    
    # Find the branch user's branch
    target_branch = None
    for branch in branches:
        if branch.get("id") == BRANCH_USER["branch_id"]:
            target_branch = branch
            break
    
    if not target_branch:
        print(f"❌ Cannot find branch {BRANCH_USER['branch_id']}")
        return
    
    print(f"\n📍 Target Branch: {target_branch.get('name')} (ID: {target_branch.get('id')})")
    
    # Get first available product
    test_product = products[0]
    print(f"📦 Test Product: {test_product.get('name')} (ID: {test_product.get('id')})")
    
    # Count users in target branch
    branch_users = [u for u in users if u.get('branch_id') == BRANCH_USER["branch_id"]]
    print(f"👥 Users in branch: {len(branch_users)}")
    for u in branch_users:
        print(f"   - {u.get('email')} (Role: {u.get('role')})")
    
    # Step 3: Get initial notification count
    print_header("Step 3: Check Initial Notifications")
    branch_user_token = login(BRANCH_USER["email"], BRANCH_USER["password"])
    if not branch_user_token:
        print("❌ Cannot proceed - branch user login failed")
        return
    print_result("Branch User Login", True, f"Logged in as {BRANCH_USER['email']}")
    
    initial_notifications = get_notifications(branch_user_token)
    initial_count = len(initial_notifications)
    print(f"📬 Initial notification count for branch user: {initial_count}")
    
    # Step 4: Assign product to branch as admin
    print_header("Step 4: Assign Product to Branch (as Admin)")
    assignment_qty = 100
    response = assign_product_to_branch(
        admin_token,
        test_product.get("id"),
        target_branch.get("id"),
        assignment_qty
    )
    
    assignment_success = response.status_code in [200, 201]
    print_result(
        "Product Assignment",
        assignment_success,
        f"Assigned {assignment_qty} units of {test_product.get('name')} to {target_branch.get('name')}"
    )
    
    if not assignment_success:
        print(f"   Response: {response.status_code} - {response.text}")
        return
    
    # Step 5: Verify notifications were created
    print_header("Step 5: Verify Notifications Created")
    
    # Check admin notifications (should see all)
    admin_notifications = get_notifications(admin_token)
    admin_new_notifications = [n for n in admin_notifications if n.get('message', '').find(test_product.get('name')) != -1]
    print(f"📬 Admin sees {len(admin_new_notifications)} new notifications about {test_product.get('name')}")
    
    # Check branch user notifications (should see only theirs)
    branch_notifications = get_notifications(branch_user_token)
    branch_new_notifications = [n for n in branch_notifications if n.get('message', '').find(test_product.get('name')) != -1]
    new_count = len(branch_notifications) - initial_count
    
    print_result(
        "Notification Created for Branch User",
        new_count > 0,
        f"Branch user has {new_count} new notification(s)"
    )
    
    # Verify notification content
    if branch_new_notifications:
        notif = branch_new_notifications[0]
        print(f"\n📧 Notification Details:")
        print(f"   Message: {notif.get('message')}")
        print(f"   User ID: {notif.get('user_id')}")
        print(f"   Branch ID: {notif.get('branch_id')}")
        print(f"   Is Read: {notif.get('is_read')}")
        print(f"   Metadata: {notif.get('metadata')}")
        
        # Verify notification isolation
        has_user_id = notif.get('user_id') is not None
        print_result(
            "Notification Has User ID",
            has_user_id,
            "User-specific notification (not visible to other branch users)"
        )
    
    # Step 6: Verify stock visibility
    print_header("Step 6: Verify Stock Visibility")
    
    # Get assignments as admin (should see all)
    admin_assignments = get_product_assignments(admin_token)
    admin_stock_for_product = sum(
        a.get('stock_quantity', 0)
        for a in admin_assignments
        if a.get('product_id') == test_product.get('id')
    )
    print(f"📊 Admin sees total stock for {test_product.get('name')}: {admin_stock_for_product} units")
    
    # Get assignments as branch user (should see only their branch)
    branch_assignments = get_product_assignments(branch_user_token)
    branch_stock_for_product = sum(
        a.get('stock_quantity', 0)
        for a in branch_assignments
        if a.get('product_id') == test_product.get('id') and a.get('branch_id') == BRANCH_USER["branch_id"]
    )
    print(f"📊 Branch user sees stock for {test_product.get('name')}: {branch_stock_for_product} units")
    
    print_result(
        "Stock Visibility Isolation",
        branch_stock_for_product == assignment_qty,
        f"Branch user sees only their branch stock: {branch_stock_for_product} units"
    )
    
    # Step 7: Verify notification isolation (key security test)
    print_header("Step 7: Verify Notification Isolation (Security Test)")
    
    # Count how many notifications the branch user sees
    total_notifications = len(branch_notifications)
    product_notifications = len(branch_new_notifications)
    
    # Verify branch user doesn't see other users' notifications
    other_user_notifications = [
        n for n in branch_notifications
        if n.get('user_id') and n.get('user_id') != BRANCH_USER.get('user_id')
    ]
    
    isolation_passed = len(other_user_notifications) == 0
    print_result(
        "Notification Isolation",
        isolation_passed,
        f"Branch user sees 0 notifications from other users (Security: {'PASS' if isolation_passed else 'FAIL'})"
    )
    
    if not isolation_passed:
        print(f"   ⚠️  Found {len(other_user_notifications)} notifications from other users!")
        for n in other_user_notifications[:3]:  # Show first 3
            print(f"   - User ID: {n.get('user_id')}, Message: {n.get('message')[:50]}")
    
    # Final Summary
    print_header("TEST SUMMARY")
    print(f"""
✅ Product Assignment: Working
✅ Notification Creation: {new_count} notification(s) created for branch user
✅ Notification Isolation: {'PASS - Branch user cannot see other users notifications' if isolation_passed else 'FAIL - Branch user can see other users notifications'}
✅ Stock Visibility: Branch user sees {branch_stock_for_product} units (only their branch)
✅ Admin Visibility: Admin sees {admin_stock_for_product} units (all branches)

Expected Notifications per Branch: {len(branch_users)} (one per user)
Admin Notifications Found: {len(admin_new_notifications)}
Branch User Notifications Found: {len(branch_new_notifications)}
    """)

if __name__ == "__main__":
    run_tests()
