# 🚀 Quick Start - Database Restoration

## Download & Extract
```bash
# 1. Download: mongodb_backup.tar.gz (347 KB)
# 2. Extract:
tar -xzf mongodb_backup.tar.gz
```

## Restore Database
```bash
# Simple restore (to 'attendance_system' database):
mongorestore --db=attendance_system mongodb_backup/attendance_system/
```

## Verify
```javascript
mongosh
use attendance_system
show collections
db.users.countDocuments()  // Should return: 98
```

## Test Login Credentials
- **Super Admin:** Mobile `0773966920`, OTP: `111111`
- **Database:** `attendance_system`
- **Collections:** 19 collections, 2000+ total documents

## Quick Stats
- 98 Users
- 177 Attendance Records  
- 407 Payroll Records
- 80 Invoices
- 27 Customers
- 4 Companies

## Update .env
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=attendance_system
```

## API Endpoint
```
GET /api/attendance/fingerprint/{fingerprint_id}
```

## Test User with Fingerprint
```javascript
db.users.findOne({fingerprint_id: "12345"})
// Should return: John Doe Updated
```

---

**Full Guide:** See `DATABASE_RESTORE_GUIDE.md` for detailed instructions
