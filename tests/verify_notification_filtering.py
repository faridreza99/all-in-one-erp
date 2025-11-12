"""
Database-level verification of notification filtering logic
Tests the MongoDB query logic that filters notifications based on user role
"""

from pymongo import MongoClient
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

def print_section(title):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def test_notification_filtering():
    """Test notification filtering at database level"""
    
    # Connect to database
    mongo_url = os.getenv('MONGO_URL')
    client = MongoClient(mongo_url)
    db = client['erp_database']
    
    print_section("DATABASE-LEVEL NOTIFICATION FILTERING TEST")
    
    # Get a test tenant with users
    print("\n1. Finding test tenant with users and branches...")
    tenant = db.users.find_one({"role": "tenant_admin"})
    if not tenant:
        print("❌ No tenant found")
        return
    
    tenant_id = tenant.get('tenant_id')
    print(f"✅ Using tenant: {tenant_id}")
    
    # Get branch users
    branch_users = list(db.users.find({
        "tenant_id": tenant_id,
        "branch_id": {"$exists": True, "$ne": None}
    }))
    
    if len(branch_users) < 2:
        print(f"⚠️  Warning: Only {len(branch_users)} branch user(s) found. Need at least 2 for proper testing.")
    
    print(f"✅ Found {len(branch_users)} branch users")
    
    # Create test notifications
    print_section("2. Creating Test Notifications")
    
    if not branch_users:
        print("❌ No branch users found. Cannot create test notifications.")
        return
    
    branch_user_1 = branch_users[0]
    user_1_id = branch_user_1.get('id')
    user_1_branch = branch_user_1.get('branch_id')
    
    print(f"Test User 1: {branch_user_1.get('email')} (Branch: {user_1_branch})")
    
    # Create test notifications
    test_notifications = []
    
    # 1. User-specific notification for user 1
    test_notifications.append({
        "tenant_id": tenant_id,
        "user_id": user_1_id,
        "branch_id": user_1_branch,
        "message": "TEST: User-specific notification for User 1",
        "type": "activity",
        "is_read": False,
        "created_at": datetime.utcnow(),
        "metadata": {"test": True}
    })
    
    # 2. Branch-wide notification (no user_id)
    test_notifications.append({
        "tenant_id": tenant_id,
        "user_id": None,
        "branch_id": user_1_branch,
        "message": "TEST: Branch-wide notification for all in branch",
        "type": "activity",
        "is_read": False,
        "created_at": datetime.utcnow(),
        "metadata": {"test": True}
    })
    
    # 3. Tenant-wide notification (no branch_id, no user_id)
    test_notifications.append({
        "tenant_id": tenant_id,
        "user_id": None,
        "branch_id": None,
        "message": "TEST: Tenant-wide notification for all users",
        "type": "activity",
        "is_read": False,
        "created_at": datetime.utcnow(),
        "metadata": {"test": True}
    })
    
    # 4. If we have a second user in the same branch, create their notification
    if len(branch_users) > 1:
        branch_user_2 = branch_users[1]
        if branch_user_2.get('branch_id') == user_1_branch:
            user_2_id = branch_user_2.get('id')
            test_notifications.append({
                "tenant_id": tenant_id,
                "user_id": user_2_id,
                "branch_id": user_1_branch,
                "message": "TEST: User-specific notification for User 2",
                "type": "activity",
                "is_read": False,
                "created_at": datetime.utcnow(),
                "metadata": {"test": True}
            })
            print(f"Test User 2: {branch_user_2.get('email')} (Same Branch)")
    
    # Insert test notifications
    result = db.notifications.insert_many(test_notifications)
    print(f"✅ Created {len(result.inserted_ids)} test notifications")
    
    # Test the filtering query
    print_section("3. Testing Notification Filtering Query (User 1 Perspective)")
    
    # This is the actual query logic from the backend
    query = {"tenant_id": tenant_id}
    
    or_conditions = [
        {"user_id": user_1_id},  # User-specific notification
        {"branch_id": None, "user_id": None}  # Tenant-wide notification
    ]
    
    # Add branch-wide notifications (branch_id matches but user_id is None)
    if user_1_branch:
        or_conditions.append({"branch_id": user_1_branch, "user_id": None})
    
    query["$or"] = or_conditions
    
    print(f"\nQuery: {query}")
    
    # Execute query
    filtered_notifications = list(db.notifications.find(query))
    test_filtered = [n for n in filtered_notifications if n.get('metadata', {}).get('test')]
    
    print(f"\n✅ Query returned {len(test_filtered)} test notifications for User 1")
    
    # Analyze results
    print_section("4. Verification Results")
    
    expected_count = 3  # User-specific + Branch-wide + Tenant-wide
    if len(branch_users) > 1 and branch_users[1].get('branch_id') == user_1_branch:
        expected_count = 3  # Should NOT include User 2's notification
    
    print(f"\nExpected notifications for User 1: {expected_count}")
    print(f"Actual notifications retrieved: {len(test_filtered)}")
    
    # Check each notification
    has_user_specific = False
    has_branch_wide = False
    has_tenant_wide = False
    has_other_user = False
    
    print("\nNotifications retrieved:")
    for n in test_filtered:
        msg = n.get('message', '')[:60]
        user_id = n.get('user_id')
        branch_id = n.get('branch_id')
        
        if user_id == user_1_id:
            has_user_specific = True
            print(f"  ✅ User-specific: {msg}")
        elif user_id and user_id != user_1_id:
            has_other_user = True
            print(f"  ❌ OTHER USER: {msg} (user_id: {user_id})")
        elif branch_id == user_1_branch and not user_id:
            has_branch_wide = True
            print(f"  ✅ Branch-wide: {msg}")
        elif not branch_id and not user_id:
            has_tenant_wide = True
            print(f"  ✅ Tenant-wide: {msg}")
    
    # Final verification
    print_section("5. Test Summary")
    
    tests_passed = []
    tests_failed = []
    
    if has_user_specific:
        tests_passed.append("User-specific notification retrieved")
    else:
        tests_failed.append("User-specific notification NOT found")
    
    if has_branch_wide:
        tests_passed.append("Branch-wide notification retrieved")
    else:
        tests_failed.append("Branch-wide notification NOT found")
    
    if has_tenant_wide:
        tests_passed.append("Tenant-wide notification retrieved")
    else:
        tests_failed.append("Tenant-wide notification NOT found")
    
    if not has_other_user:
        tests_passed.append("Other users' notifications properly filtered out (SECURITY: PASS)")
    else:
        tests_failed.append("Other users' notifications leaked (SECURITY: FAIL)")
    
    if len(test_filtered) == expected_count:
        tests_passed.append(f"Correct count ({expected_count} notifications)")
    else:
        tests_failed.append(f"Incorrect count (expected {expected_count}, got {len(test_filtered)})")
    
    print("\n✅ PASSED:")
    for test in tests_passed:
        print(f"  - {test}")
    
    if tests_failed:
        print("\n❌ FAILED:")
        for test in tests_failed:
            print(f"  - {test}")
    
    overall_pass = len(tests_failed) == 0
    
    print(f"\n{'='*80}")
    if overall_pass:
        print("  ✅ ALL TESTS PASSED - Notification filtering working correctly!")
    else:
        print("  ❌ SOME TESTS FAILED - Review implementation")
    print(f"{'='*80}")
    
    # Cleanup
    print_section("6. Cleanup")
    cleanup_result = db.notifications.delete_many({"metadata.test": True})
    print(f"✅ Removed {cleanup_result.deleted_count} test notifications")
    
    client.close()
    
    return overall_pass

if __name__ == "__main__":
    try:
        success = test_notification_filtering()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
