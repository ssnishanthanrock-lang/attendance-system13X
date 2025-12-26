# Company Short Code Feature Documentation

## Overview
Added company short code functionality to support multiple companies with the same fingerprint IDs. Each company gets a unique short code (max 20 characters) that must be included in fingerprint attendance API calls.

---

## Problem Solved
**Issue:** Multiple companies can have employees with the same fingerprint ID (e.g., fingerprint ID "1" exists in Company A and Company B)

**Solution:** Company short codes uniquely identify which company's employee is scanning, preventing conflicts.

---

## Features Added

### 1. Company Short Code Field
- **Location:** Super Admin → Manage Company page
- **Field:** "Company Short Code" input with Save button
- **Validation:**
  - Max 20 characters
  - Must be unique across all companies
  - Cannot be empty
  - Real-time validation on save

### 2. Updated Fingerprint Attendance API
**New Endpoint:**
```
GET /api/attendance/fingerprint/{company_short_code}/{fingerprint_id}
```

**Old Endpoint (No longer works):**
```
❌ GET /api/attendance/fingerprint/{fingerprint_id}
```

---

## Implementation Details

### Backend Changes

#### 1. Company Model (`server.py`)
```python
class Company(BaseModel):
    ...
    short_code: Optional[str] = None  # NEW: Company short code
    ...
```

#### 2. New Endpoint: Update Short Code
```
PUT /api/superadmin/companies/{company_id}/short-code
```

**Request Body:**
```json
{
    "short_code": "COMPANY1"
}
```

**Validations:**
- ✅ Super admin authentication required
- ✅ Short code cannot be empty
- ✅ Max 20 characters
- ✅ Must be unique (checks for duplicates)

**Response:**
```json
{
    "message": "Short code updated successfully"
}
```

**Error Responses:**
```json
// Empty short code
{
    "detail": "Short code cannot be empty"
}

// Too long
{
    "detail": "Short code must be max 20 characters"
}

// Duplicate
{
    "detail": "This short code is already in use by another company"
}
```

#### 3. Updated Fingerprint Attendance Endpoint

**URL Pattern:**
```
GET /api/attendance/fingerprint/{company_short_code}/{fingerprint_id}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| company_short_code | string | Yes | Company identifier (max 20 chars) |
| fingerprint_id | string | Yes | Employee fingerprint ID |

**Logic Flow:**
1. Validate company short code is not empty
2. Find company by short_code
3. Find user with fingerprint_id **within that specific company**
4. Process attendance (check-in or check-out)

**Error Responses:**

Missing company short code:
```json
{
    "success": false,
    "message": "Missing company short code"
}
```

Invalid company short code:
```json
{
    "success": false,
    "message": "Invalid company short code"
}
```

User not found in company:
```json
{
    "success": false,
    "message": "No User"
}
```

---

### Frontend Changes

#### 1. Company Detail Page (`SuperAdminCompanyDetail.js`)

**Added UI Components:**
- Input field for company short code (max 20 chars)
- Save button with validation
- Real-time character count limiting

**Location:** Company Information card, after Status badge

**Code:**
```jsx
<div>
  <label className="text-sm font-medium text-gray-600">Company Short Code</label>
  <div className="flex items-center gap-2">
    <Input
      value={company?.short_code || ''}
      onChange={(e) => setCompany({ ...company, short_code: e.target.value.slice(0, 20) })}
      placeholder="Enter short code (max 20 chars)"
      maxLength={20}
      className="max-w-xs"
    />
    <Button onClick={handleSaveShortCode} size="sm" variant="outline">
      <Save className="w-4 h-4 mr-1" />
      Save
    </Button>
  </div>
</div>
```

**Handler Function:**
```javascript
const handleSaveShortCode = async () => {
  try {
    if (!company.short_code || company.short_code.trim() === '') {
      toast.error('Please enter a short code');
      return;
    }
    await api.put(`/superadmin/companies/${companyId}/short-code`, {
      short_code: company.short_code
    });
    toast.success('Company short code updated successfully');
    fetchCompany();
  } catch (error) {
    toast.error(error.response?.data?.detail || 'Failed to update short code');
  }
};
```

---

## Usage Examples

### Setting Up Company Short Code

1. **Login as Super Admin**
2. **Go to:** Super Admin Dashboard → Manage Companies
3. **Click:** "Manage" button on any company
4. **Find:** "Company Short Code" field
5. **Enter:** Unique code (e.g., "ABC123", "COMPANY1")
6. **Click:** Save button
7. **Verify:** Success message appears

### API Integration Examples

#### Python
```python
import requests

company_code = "COMPANY1"
fingerprint_id = "123"
url = f"http://your-domain.com/api/attendance/fingerprint/{company_code}/{fingerprint_id}"

response = requests.get(url)
data = response.json()

if data["success"]:
    print(data["message"])  # "Attendance Success - John Doe"
else:
    print(f"Error: {data['message']}")
```

#### JavaScript
```javascript
const companyCode = "COMPANY1";
const fingerprintId = "123";
const url = `http://your-domain.com/api/attendance/fingerprint/${companyCode}/${fingerprintId}`;

fetch(url)
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log(data.message);  // Display on LCD
    } else {
      console.log(`Error: ${data.message}`);
    }
  });
```

#### cURL
```bash
# Successful attendance
curl http://your-domain.com/api/attendance/fingerprint/COMPANY1/123

# Missing company code (404)
curl http://your-domain.com/api/attendance/fingerprint//123

# Invalid company code
curl http://your-domain.com/api/attendance/fingerprint/INVALID/123

# Wrong fingerprint ID for company
curl http://your-domain.com/api/attendance/fingerprint/COMPANY1/999
```

---

## Testing Results

### ✅ Test Scenarios

**Test 1: Old URL format (without company code)**
```bash
GET /api/attendance/fingerprint/123
Result: 404 Not Found ✓
```

**Test 2: Invalid company short code**
```bash
GET /api/attendance/fingerprint/INVALID/123
Result: {"success": false, "message": "Invalid company short code"} ✓
```

**Test 3: Valid company and fingerprint**
```bash
GET /api/attendance/fingerprint/COMPANY1/123
Result: {"success": true, "message": "Attendance Success - Test Admin"} ✓
```

**Test 4: Wrong fingerprint ID for company**
```bash
GET /api/attendance/fingerprint/COMPANY1/999
Result: {"success": false, "message": "No User"} ✓
```

**Test 5: Duplicate short code attempt**
```
PUT /superadmin/companies/{id}/short-code
Body: {"short_code": "COMPANY1"}
Result: 400 - "This short code is already in use" ✓
```

---

## Database Schema Updates

### Companies Collection
```json
{
    "id": "company-uuid",
    "name": "Test Company Pvt Ltd",
    "short_code": "COMPANY1",  // <-- NEW FIELD
    "admin_name": "Admin Name",
    "admin_mobile": "0771234567",
    ...
}
```

### No changes to Users or Attendance collections

---

## Migration Notes

### For Existing Companies:
- `short_code` field is optional (can be null)
- Super Admin must set short code before using fingerprint attendance
- No automatic short code generation
- Each company admin should be informed of their company's short code

### For New Companies:
- Short code should be set during company setup
- Recommended format: Company initials + number (e.g., "ABC001")

---

## Best Practices

### Short Code Naming Conventions:
✅ **Good Examples:**
- `ABC123` - Company initials + number
- `COMPANY1` - Descriptive + number
- `HQ-2025` - Location + year
- `ITSignature` - Company name

❌ **Avoid:**
- Special characters (@, #, $, etc.)
- Spaces
- Very long codes (keep under 15 chars for readability)
- Confusing codes (O vs 0, I vs 1)

### Device Configuration:
1. Store company short code in device memory
2. Prepend to all API calls
3. Display short code on device screen for verification
4. Include in device logs

---

## API URL Summary

### ✅ New Correct URL:
```
GET /api/attendance/fingerprint/{company_short_code}/{fingerprint_id}

Example: https://your-domain.com/api/attendance/fingerprint/COMPANY1/123
```

### ❌ Old Deprecated URL:
```
GET /api/attendance/fingerprint/{fingerprint_id}

Status: No longer works (404)
```

---

## Files Modified

1. **Backend:**
   - `/app/backend/server.py`
     - Added `short_code` to Company model
     - Added PUT endpoint for updating short code
     - Updated fingerprint attendance endpoint

2. **Frontend:**
   - `/app/frontend/src/pages/SuperAdminCompanyDetail.js`
     - Added short code input field
     - Added save handler with validation

---

## Future Enhancements

- [ ] Auto-generate short codes during company creation
- [ ] Short code validation rules (alphanumeric only)
- [ ] Bulk short code assignment tool
- [ ] QR code generation with company short code
- [ ] Device configuration wizard with short code setup
- [ ] Short code search/filter in company list

---

**Status:** ✅ Fully Implemented and Tested
**Version:** 1.0
**Date:** December 26, 2025
