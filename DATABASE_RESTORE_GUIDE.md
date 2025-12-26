# MongoDB Database Restoration Guide

## 📦 Database Backup Details

**Database Name:** `attendance_system`
**Backup File:** `mongodb_backup.tar.gz`
**Backup Date:** 2025-12-26
**Total Size:** 347 KB (compressed), 1.3 MB (uncompressed)

### Database Statistics:
- **Users:** 98 documents
- **Attendance:** 177 documents
- **Payroll:** 407 documents
- **Activity Logs:** 988 documents
- **Invoices:** 80 documents
- **Customers:** 27 documents
- **Products:** 29 documents
- **Companies:** 4 documents
- **And more...**

---

## 🚀 How to Restore on Your PC

### Prerequisites:
1. **MongoDB installed** on your PC
   - Download from: https://www.mongodb.com/try/download/community
   - Or install via package manager

2. **MongoDB running** on your PC
   ```bash
   # Check if MongoDB is running
   mongosh  # or mongo (for older versions)
   ```

---

## 📥 Step 1: Download the Backup File

The backup file is located at:
```
/app/mongodb_backup.tar.gz
```

**To download:**
1. You can download this file from your file browser in the Emergent platform
2. Or use the file download feature
3. File size: ~347 KB

---

## 📂 Step 2: Extract the Backup

### On Windows:
```cmd
# Extract using 7-Zip, WinRAR, or Windows built-in extractor
# Right-click on mongodb_backup.tar.gz → Extract All
```

### On Mac/Linux:
```bash
# Extract the archive
tar -xzf mongodb_backup.tar.gz

# This will create a folder: mongodb_backup/attendance_system/
```

You should see a folder structure like:
```
mongodb_backup/
└── attendance_system/
    ├── users.bson
    ├── attendance.bson
    ├── payroll.bson
    ├── companies.bson
    ├── ... (and more .bson and .metadata.json files)
```

---

## 🔄 Step 3: Restore the Database

### Option A: Restore to Same Database Name (attendance_system)

```bash
# Navigate to where you extracted the backup
cd /path/to/extracted/backup

# Restore the database
mongorestore --db=attendance_system mongodb_backup/attendance_system/
```

**Expected Output:**
```
preparing collections to restore from
reading metadata for attendance_system.users from mongodb_backup/attendance_system/users.metadata.json
restoring attendance_system.users from mongodb_backup/attendance_system/users.bson
restoring attendance_system.attendance from mongodb_backup/attendance_system/attendance.bson
...
98 document(s) restored successfully. 0 document(s) failed to restore.
```

### Option B: Restore to Different Database Name

```bash
# Restore to a different database name (e.g., my_test_db)
mongorestore --db=my_test_db mongodb_backup/attendance_system/
```

### Option C: Restore to Specific MongoDB Connection

```bash
# If MongoDB is running on different port or host
mongorestore --host=localhost --port=27017 --db=attendance_system mongodb_backup/attendance_system/

# With authentication
mongorestore --host=localhost --port=27017 --username=myuser --password=mypass --authenticationDatabase=admin --db=attendance_system mongodb_backup/attendance_system/
```

---

## ✅ Step 4: Verify the Restoration

### Check Database Exists:
```bash
mongosh  # or 'mongo' for older versions

# List all databases
show dbs

# You should see: attendance_system

# Switch to the database
use attendance_system

# List collections
show collections

# Should show:
# - users
# - attendance
# - payroll
# - companies
# - invoices
# - customers
# - products
# etc.
```

### Check Document Counts:
```javascript
// In mongosh/mongo shell:
use attendance_system

db.users.countDocuments()          // Should return: 98
db.attendance.countDocuments()     // Should return: 177
db.payroll.countDocuments()        // Should return: 407
db.companies.countDocuments()      // Should return: 4
db.invoices.countDocuments()       // Should return: 80
```

### Sample Query - View Users:
```javascript
// View first 5 users
db.users.find({}, {_id: 0, name: 1, mobile: 1, role: 1}).limit(5)
```

---

## 🔧 Step 5: Update Your Application Configuration

After restoring the database, update your application's `.env` file:

```env
# MongoDB Connection
MONGO_URL=mongodb://localhost:27017
DB_NAME=attendance_system
```

Or if you restored to a different database name:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=my_test_db
```

---

## 📋 Collections in the Database

| Collection Name | Documents | Description |
|----------------|-----------|-------------|
| users | 98 | Employee and admin user accounts |
| attendance | 177 | Daily attendance check-in/out records |
| payroll | 407 | Monthly payroll calculations |
| activity_logs | 988 | System activity audit trail |
| invoices | 80 | Customer invoices |
| customers | 27 | Customer information |
| products | 29 | Product catalog |
| invoice_payments | 28 | Invoice payment records |
| companies | 4 | Company/organization details |
| settings | 4 | System settings per company |
| increments | 5 | Salary increment history |
| advances | 16 | Salary advance records |
| leaves | 16 | Leave/absence records |
| estimates | 13 | Sales estimates/quotations |
| tracking_sessions | 20 | Location tracking data |
| otps | 123 | OTP verification codes |
| deleted_attendance | 3 | Soft-deleted attendance records |
| attendance_history | 3 | Attendance modification history |
| product_categories | 14 | Product categorization |

---

## 🛠️ Troubleshooting

### Issue: "command not found: mongorestore"
**Solution:** Install MongoDB Database Tools
```bash
# Download from: https://www.mongodb.com/try/download/database-tools

# Or install via package manager:
# Ubuntu/Debian:
sudo apt-get install mongodb-database-tools

# Mac:
brew install mongodb-database-tools

# Windows: Download from MongoDB website
```

### Issue: "Failed to connect to MongoDB"
**Solution:** Ensure MongoDB is running
```bash
# Start MongoDB service
# Windows: Start from Services
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Issue: "database already exists"
**Solution:** Drop existing database first (⚠️ WARNING: This deletes all data!)
```javascript
// In mongosh/mongo shell:
use attendance_system
db.dropDatabase()

// Then run mongorestore again
```

Or restore to a different database name:
```bash
mongorestore --db=attendance_system_backup mongodb_backup/attendance_system/
```

---

## 📊 Testing the Restored Database

### Test 1: Count Records
```javascript
use attendance_system
db.users.countDocuments()  // Should be 98
```

### Test 2: Find a Specific User
```javascript
db.users.findOne({name: "Super Administrator"})
```

### Test 3: Check Attendance Records
```javascript
db.attendance.find({date: "2025-12-26"}).limit(5)
```

### Test 4: Verify Fingerprint IDs
```javascript
// Check users with fingerprint_id
db.users.find({fingerprint_id: {$exists: true, $ne: null}}, {name: 1, fingerprint_id: 1})
```

---

## 🔐 Important Notes

1. **Passwords:** User passwords are bcrypt-hashed in the database (secure)
2. **OTP Codes:** Most OTPs are 111111 for testing
3. **Fingerprint IDs:** Some users have fingerprint_id field for testing
4. **Timezone:** All timestamps are stored in Sri Lanka timezone (Asia/Colombo)
5. **Super Admin:** Mobile: 0773966920 (OTP: 111111)

---

## 📞 Support

If you encounter any issues during restoration:
1. Check MongoDB logs: `/var/log/mongodb/mongod.log` (Linux) or MongoDB installation directory (Windows)
2. Verify MongoDB version compatibility
3. Ensure sufficient disk space
4. Check MongoDB connection string format

---

## 🎉 Success!

Once restored successfully, you should be able to:
✅ Connect your FastAPI backend to the restored database
✅ Login using existing user credentials
✅ View attendance records, payroll, invoices
✅ Test the fingerprint attendance API
✅ Access all existing data and functionality

**Happy Testing! 🚀**
