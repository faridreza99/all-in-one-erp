# MongoDB Atlas Setup Guide

## ⚠️ CRITICAL: Authentication Data Lost After Restart?

If your login/register data is being lost every time you restart Replit, it means **MongoDB Atlas is blocking your connection** due to IP whitelisting.

## The Problem

When you see "Authentication failed" errors or the backend logs show:
```
SSL handshake failed: TLSV1_ALERT_INTERNAL_ERROR
```

This means MongoDB Atlas is **rejecting connections from Replit** because Replit's IP address is not whitelisted in your MongoDB Atlas Network Access settings.

## The Solution: Whitelist Replit's IP Address

Follow these steps to fix the connection:

### Step 1: Go to MongoDB Atlas
1. Open your browser and go to https://cloud.mongodb.com
2. Log in to your MongoDB Atlas account
3. Select your project (the one containing your database cluster)

### Step 2: Navigate to Network Access
1. In the left sidebar, find **Security** section
2. Click on **Network Access**
3. You'll see a list of whitelisted IP addresses (if any)

### Step 3: Add IP Address
1. Click the **"Add IP Address"** button (green button, top right)
2. A dialog will appear with two options:

   **Option A: Allow from Anywhere (Recommended for Development)**
   - Click "Allow Access from Anywhere"
   - This will add `0.0.0.0/0` to the whitelist
   - ✅ Best for Replit since IPs can change
   - ⚠️ Less secure but fine for development/testing

   **Option B: Add Specific IP (More Secure)**
   - If you know Replit's specific IP address, enter it manually
   - Format: `xxx.xxx.xxx.xxx/32`
   - ✅ More secure
   - ⚠️ May need to update if Replit changes IPs

3. Click **"Confirm"**

### Step 4: Wait for Changes to Propagate
- MongoDB Atlas needs ~60 seconds to apply the changes
- Be patient! Don't restart immediately

### Step 5: Restart Your Replit Server
1. In Replit, stop the Backend workflow (if running)
2. Start the Backend workflow again
3. Watch the startup logs for:
   ```
   ✅ MongoDB Atlas connection successful!
   ```

## Verify the Connection

After restarting, check the backend logs. You should see:

```
============================================================
🔍 Testing MongoDB Atlas connection...
   Database: erp_db
✅ MongoDB Atlas connection successful!
============================================================
```

If you still see errors, the connection is not working.

## What Happens When MongoDB is Not Connected?

- ❌ User registration fails
- ❌ Login attempts fail  
- ❌ All data is lost on restart
- ❌ "Authentication failed" errors appear

When MongoDB **is** connected:
- ✅ User data persists in MongoDB Atlas (cloud database)
- ✅ Login/register works correctly
- ✅ Data survives server restarts
- ✅ Multi-tenant data is properly isolated

## Alternative: Using a Different Database

If you don't have MongoDB Atlas access or prefer a different solution:

1. **Get a Free MongoDB Atlas Account**:
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Create a free M0 cluster (no credit card required)
   - Follow this guide to set it up

2. **Use a Different MongoDB Service**:
   - Update the `MONGO_URL` secret with your new connection string
   - Ensure the new service allows connections from Replit

## Troubleshooting

### Error: "Authentication failed" 
**Cause**: Wrong username/password in MONGO_URL  
**Fix**: Verify credentials in your MongoDB Atlas connection string

### Error: "SSL handshake failed"
**Cause**: IP not whitelisted  
**Fix**: Follow steps above to whitelist 0.0.0.0/0

### Error: "Server not found"
**Cause**: Incorrect cluster URL in MONGO_URL  
**Fix**: Copy the correct connection string from MongoDB Atlas

### Connection works but data is still lost
**Cause**: Multiple database instances or incorrect DB_NAME  
**Fix**: Ensure DB_NAME in .env matches your MongoDB database name

## Need Help?

Check the backend logs for detailed error messages:
- The startup logs will show connection status
- Login/register errors will show specific issues

The system now provides clear error messages to help diagnose MongoDB connection problems!
