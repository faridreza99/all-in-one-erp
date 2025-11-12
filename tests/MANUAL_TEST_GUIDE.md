# Manual Testing Guide: Role-Based Notifications & Stock Visibility

## Overview
This guide walks you through testing the role-based notification and stock visibility system.

## What We're Testing

### 1. **Notification Filtering (Security Critical)**
   - ✅ Tenant admins see ALL notifications across the system
   - ✅ Branch users see ONLY their own notifications
   - ✅ Branch users see branch-wide announcements (no user_id)
   - ✅ Branch users see tenant-wide messages (no branch_id, no user_id)
   - ❌ Branch users CANNOT see other users' notifications in the same branch

### 2. **Stock Visibility**
   - ✅ Tenant admins see aggregated stock across ALL branches
   - ✅ Branch users see stock only from their assigned branch

### 3. **Product Assignment Notifications**
   - ✅ When a product is assigned to a branch, all users in that branch get notified
   - ✅ Each user gets their own notification (with their user_id)

## Prerequisites
- You need at least:
  - 1 Tenant Admin account
  - 2 Branch User accounts (assigned to the same branch)
  - 1 Branch with users assigned to it
  - 1 Product to assign

## Test Scenario 1: Product Assignment & Notification Creation

### Step 1: Login as Tenant Admin
1. Open the application
2. Login with a tenant admin account
3. You should see the dashboard

### Step 2: Navigate to Product Assignment
1. Go to `Branch Management` → `Product Branch Assignment`
2. You should see a list of all products

### Step 3: Assign Product to Branch
1. Select a product from the dropdown
2. Select a branch that has at least 2 users assigned to it
3. Enter stock quantity (e.g., 100)
4. Enter sale price (optional)
5. Click "Assign Product"
6. ✅ **Expected**: Success message appears

### Step 4: Check Admin Notifications
1. Click the notification bell icon in the top navigation
2. ✅ **Expected**: You should see notifications for ALL users in that branch
   - Example: If branch has 2 users, you see 2 notifications about the product assignment

### Step 5: Check Branch User 1 Notifications
1. Logout from admin account
2. Login with the first branch user account
3. Click the notification bell icon
4. ✅ **Expected**: You should see ONLY 1 notification about the product assignment
5. ✅ **Expected**: The notification shows the product name and branch name
6. ✅ **Expected**: Notification is marked as unread (appears in unread count)

### Step 6: Check Branch User 2 Notifications (SECURITY TEST)
1. Logout from branch user 1
2. Login with the second branch user account (same branch)
3. Click the notification bell icon
4. ✅ **Expected**: You should see ONLY 1 notification about the product assignment
5. ❌ **CRITICAL**: You should NOT see branch user 1's notification
6. ✅ **Expected**: You see your own notification only

### Step 7: Verify Notification Details
1. While logged in as a branch user, open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page or click the notification bell
4. Find the request to `/api/notifications`
5. Check the response JSON
6. ✅ **Expected**: Each notification has:
   - `user_id`: Your user ID
   - `branch_id`: Your branch ID
   - `message`: Contains product and branch name
   - `metadata`: Contains product_id and stock_quantity

## Test Scenario 2: Stock Visibility

### Step 1: Login as Tenant Admin
1. Login with tenant admin account
2. Go to `Product Branch Assignment` page

### Step 2: Check Total Stock (Admin View)
1. Select the product you assigned earlier
2. Look at the "Total Stock" column or summary
3. ✅ **Expected**: Shows total stock across ALL branches
   - Example: If product is assigned to 2 branches with 100 each, you see 200

### Step 3: Login as Branch User
1. Logout and login with a branch user account
2. Go to `Product Branch Assignment` page

### Step 4: Check Total Stock (Branch User View)
1. Select the same product
2. Look at the "Total Stock" column or summary
3. ✅ **Expected**: Shows stock ONLY for your assigned branch
   - Example: If your branch has 100 units, you see 100 (not 200)

### Step 5: Verify Branch Selection Restriction
1. While on the Product Assignment page as a branch user
2. Try to select a branch from the dropdown
3. ✅ **Expected**: You can only see YOUR assigned branch in the dropdown
4. ❌ **Expected**: You CANNOT see or select other branches

## Test Scenario 3: POS Stock Display

### Step 1: Login as Tenant Admin
1. Go to POS page
2. Search for the product you assigned
3. ✅ **Expected**: Stock shows total across all branches

### Step 2: Login as Branch User
1. Go to POS page
2. Search for the same product
3. ✅ **Expected**: Stock shows only for your assigned branch
4. ✅ **Expected**: Price shows branch-specific price (if set) or base price

## Common Issues & Troubleshooting

### Issue: Branch user sees other users' notifications
- **Diagnosis**: Security bug in filtering logic
- **Check**: Look at the network response for `/api/notifications`
- **Expected fix**: Only notifications with your user_id, or branch-wide (user_id: null), or tenant-wide (both null)

### Issue: Branch user sees stock from other branches
- **Diagnosis**: Stock calculation not filtering by branch
- **Check**: Verify `totalStockForProduct` function filters assignments by branch_id
- **Expected fix**: Should only sum stock where branch_id matches user's assigned branch

### Issue: No notifications created after product assignment
- **Diagnosis**: Notification creation logic not triggered
- **Check**: Backend logs for errors
- **Expected fix**: POST `/api/product-branches` should create one notification per user in the branch

## Database Verification (Optional)

If you have database access, you can verify directly:

```javascript
// Check notifications structure
db.notifications.find({
  tenant_id: "your-tenant-id",
  branch_id: "your-branch-id"
}).pretty()

// Expected structure:
{
  user_id: "specific-user-id",        // For user-specific notifications
  branch_id: "branch-id",             // Branch association
  message: "Product assigned...",
  metadata: {
    product_id: "...",
    stock_quantity: 100
  },
  is_read: false,
  created_at: ISODate(...)
}

// Check product assignments
db.product_branch_assignments.find({
  tenant_id: "your-tenant-id"
}).pretty()
```

## Success Criteria

All tests pass if:
- ✅ Tenant admins see all notifications and stock across branches
- ✅ Branch users see only their own notifications
- ✅ Branch users see only their branch stock
- ✅ Product assignment creates one notification per branch user
- ✅ Notifications have proper user_id, branch_id, and metadata
- ✅ Branch users cannot access other branches in UI
- ✅ Unread notification count shows correctly in notification bell

## Test Results Template

**Date**: [Fill in]  
**Tester**: [Your name]  
**Environment**: [Development/Staging]

| Test Case | Result | Notes |
|-----------|--------|-------|
| Product assignment creates notifications | ☐ Pass ☐ Fail | |
| Admin sees all notifications | ☐ Pass ☐ Fail | |
| Branch user sees only own notifications | ☐ Pass ☐ Fail | |
| Branch user CANNOT see other user notifications | ☐ Pass ☐ Fail | |
| Admin sees total stock across branches | ☐ Pass ☐ Fail | |
| Branch user sees only branch stock | ☐ Pass ☐ Fail | |
| Branch selection restricted for branch users | ☐ Pass ☐ Fail | |
| Notification bell shows correct unread count | ☐ Pass ☐ Fail | |

**Overall Result**: ☐ All Pass ☐ Some Failures

**Issues Found**: [List any issues]
