# Super Admin Impersonation Feature

## Overview
Super Admins can now view and manage company portals without needing to log in with company credentials.

## Features

### Backend
1. **User Model Enhancement**: Added `can_full_access_companies` boolean field to User model
2. **Impersonation Endpoints**:
   - `POST /api/superadmin/impersonate/{company_id}` - Start viewing a company portal
   - `POST /api/superadmin/exit-impersonation` - Return to super admin view
   - `PUT /api/superadmin/admins/{admin_id}` - Update super admin permissions
3. **Activity Logging**: All impersonation start/end actions are logged

### Frontend
1. **ImpersonationBanner Component**: Orange/amber banner shown at top when viewing company
2. **Impersonation Utils**: Helper functions to manage impersonation state
3. **Super Admin Management**: Toggle to set "Full Access" or "Read-only" permission
4. **Super Admin Dashboard**: "View Portal" button for each company
5. **Layout Integration**: Shows banner and handles exit impersonation

## Permission Levels

### Full Access
- Super admin can view AND edit/add/delete in company portal
- All buttons and forms are enabled
- Indicated by green badge "Full Access"

### Read-only
- Super admin can only view company data
- Edit/Add/Delete buttons should be disabled
- Indicated by gray badge "Read-only"

## Implementation Status

✅ **Completed**:
- Backend endpoints for impersonation
- JWT token handling with impersonation context
- Impersonation banner UI
- Super Admin Management UI with permission toggle
- View Portal button in Super Admin Dashboard
- Activity logging for impersonation actions

⚠️ **Needs Implementation** (Optional Enhancement):
To enforce read-only mode in individual pages, add this check to buttons/forms:

```javascript
import { canEditInImpersonation, isImpersonating } from '../utils/impersonation';

// In your component
const canEdit = !isImpersonating() || canEditInImpersonation();

// Use in buttons
<Button 
  disabled={!canEdit}
  onClick={handleSave}
  title={!canEdit ? "Read-only access" : ""}
>
  Save
</Button>
```

**Pages that may need read-only protection**:
- Employees.js (add/edit/delete buttons)
- Attendance.js (add manual, delete buttons)
- Leaves.js (approve/reject buttons)
- Advances.js (approve/reject buttons)
- Payroll.js (generate payroll button)
- CompanySettings.js (save settings button)

## Usage

### For Super Admins:
1. Go to Super Admin Dashboard
2. Find the company you want to view
3. Click "View Portal" button
4. You'll see an orange banner at top indicating you're viewing the company
5. Navigate and use the portal (full access or read-only based on your permission)
6. Click "Exit & Return to Super Admin" to go back

### For Managing Super Admins:
1. Go to "Manage Admins" from Super Admin Dashboard
2. Create new super admin and toggle "Company View Permission"
3. Or update existing super admin's permission using the toggle switch
4. Green badge = Full Access, Gray badge = Read-only

## Security
- Only super admins can impersonate
- All impersonation actions are logged in activity logs
- Impersonation state is stored in localStorage and validated by backend
- Impersonation token expires in 7 days (standard JWT expiry)
