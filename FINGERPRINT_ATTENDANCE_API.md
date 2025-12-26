# Fingerprint Attendance API Documentation

## API Endpoint
```
GET /api/attendance/fingerprint/{fingerprint_id}
```

### Full URL
```
http://your-domain.com/api/attendance/fingerprint/{fingerprint_id}
```

**Example:**
```
http://localhost:8001/api/attendance/fingerprint/12345
```

## Description
This endpoint allows fingerprint devices to mark employee attendance without authentication.
- **No authentication required** - Designed for direct integration with fingerprint devices
- **Automatic check-in/check-out logic** - Intelligently handles the attendance flow
- **Duplicate prevention** - Requires 10-minute gap between check-in and check-out

## How It Works

### Flow Diagram
```
Fingerprint Scan
    ↓
Find User by fingerprint_id
    ↓
    ├─→ User Not Found → Return "No User"
    │
    └─→ User Found
        ↓
        Check Today's Attendance
        ↓
        ├─→ No Attendance → Mark Check-In → Return "Attendance Success"
        │
        └─→ Has Attendance
            ↓
            ├─→ Already has Check-Out → Return "Already Completed"
            │
            └─→ No Check-Out Yet
                ↓
                Check Time Difference
                ↓
                ├─→ < 10 minutes → Return "Please Wait"
                │
                └─→ ≥ 10 minutes → Mark Check-Out → Return "Leaving Marked Success"
```

## Request

### Method
`GET`

### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| fingerprint_id | string | Yes | The fingerprint ID assigned to the employee |

### Example Request
```bash
curl http://localhost:8001/api/attendance/fingerprint/12345
```

## Response

### Success Response - Check-In
**Status Code:** 200 OK

```json
{
    "success": true,
    "message": "Attendance Success - John Doe",
    "action": "check_in",
    "time": "09:30"
}
```

### Success Response - Check-Out
**Status Code:** 200 OK

```json
{
    "success": true,
    "message": "Leaving Marked Success - John Doe",
    "action": "check_out",
    "time": "17:45"
}
```

### Error Response - User Not Found
**Status Code:** 200 OK

```json
{
    "success": false,
    "message": "No User"
}
```

### Error Response - Too Soon
**Status Code:** 200 OK

```json
{
    "success": false,
    "message": "Please wait 8 more minutes before marking leaving"
}
```

### Error Response - Already Completed
**Status Code:** 200 OK

```json
{
    "success": false,
    "message": "Attendance already completed for John Doe today"
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Whether the operation was successful |
| message | string | Human-readable message with employee name |
| action | string | (Optional) Either "check_in" or "check_out" |
| time | string | (Optional) Time in HH:MM format |

## Business Logic

### 1. User Lookup
- Searches database for user with matching `fingerprint_id`
- If not found → Returns "No User" error

### 2. Check-In Logic (First Scan of the Day)
- If no attendance record exists for today:
  - Creates new attendance record
  - Sets `check_in` to current time
  - Returns success message: "Attendance Success - [Employee Name]"

### 3. Check-Out Logic (Second Scan of the Day)
- If attendance record exists without `check_out`:
  - Checks time difference between current time and `check_in`
  - **If < 10 minutes:**
    - Returns error: "Please wait X more minutes before marking leaving"
    - This prevents accidental duplicate scans
  - **If ≥ 10 minutes:**
    - Updates attendance record with `check_out` time
    - Returns success message: "Leaving Marked Success - [Employee Name]"

### 4. Duplicate Prevention
- Once both check-in and check-out are marked:
  - Returns error: "Attendance already completed for [Employee Name] today"
  - Prevents any further scans for the same day

## Testing Results

### Test Scenarios
✅ **Test 1:** First scan (Check-in) - SUCCESS
```json
{
    "success": true,
    "message": "Attendance Success - John Doe Updated",
    "action": "check_in",
    "time": "05:03"
}
```

✅ **Test 2:** Immediate second scan (<10 min) - CORRECTLY BLOCKED
```json
{
    "success": false,
    "message": "Please wait 9 more minutes before marking leaving"
}
```

✅ **Test 3:** Invalid fingerprint ID - HANDLED
```json
{
    "success": false,
    "message": "No User"
}
```

✅ **Test 4:** Second scan after 10 minutes (Check-out) - SUCCESS
```json
{
    "success": true,
    "message": "Leaving Marked Success - John Doe Updated",
    "action": "check_out",
    "time": "05:04"
}
```

✅ **Test 5:** Third scan (already completed) - CORRECTLY BLOCKED
```json
{
    "success": false,
    "message": "Attendance already completed for John Doe Updated today"
}
```

## Integration Examples

### Python
```python
import requests

fingerprint_id = "12345"
url = f"http://your-domain.com/api/attendance/fingerprint/{fingerprint_id}"

response = requests.get(url)
data = response.json()

if data["success"]:
    print(data["message"])  # Display on device LCD
else:
    print(f"Error: {data['message']}")
```

### JavaScript/Node.js
```javascript
const fingerprintId = "12345";
const url = `http://your-domain.com/api/attendance/fingerprint/${fingerprintId}`;

fetch(url)
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log(data.message);  // Display on device
    } else {
      console.log(`Error: ${data.message}`);
    }
  });
```

### cURL
```bash
curl http://your-domain.com/api/attendance/fingerprint/12345
```

## Database Schema

### Users Collection - Fingerprint Field
```json
{
    "id": "user-uuid",
    "name": "John Doe",
    "fingerprint_id": "12345",  // <-- New field
    "company_id": "company-uuid",
    ...
}
```

### Attendance Collection
```json
{
    "id": "attendance-uuid",
    "company_id": "company-uuid",
    "employee_id": "user-uuid",
    "employee_name": "John Doe",
    "date": "2025-12-26",
    "check_in": "2025-12-26T09:30:00",
    "check_out": "2025-12-26T17:45:00",
    "status": "present",
    "created_by": "user-uuid",
    "created_at": "2025-12-26T09:30:00Z"
}
```

## Notes
- The 10-minute gap prevents accidental double-scans
- All times are stored in UTC timezone
- No authentication required - suitable for direct device integration
- Employee names are automatically capitalized in responses
- The API is idempotent - multiple calls with same result won't cause issues
