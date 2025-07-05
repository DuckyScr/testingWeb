# Client Visibility System

## Overview

A comprehensive role-based client visibility system has been implemented that allows administrators to control whether each role can see all clients in the system or only clients assigned to their user account.

## How It Works

### 1. Permission-Based Control

- **New Permission**: `view_all_clients`
- If a role has this permission = `true`: Users can see ALL clients in the system
- If a role has this permission = `false`: Users can only see:
  - Clients assigned to them (where `salesRepId` matches their user ID)
  - Unassigned clients (where `salesRepId` is `null`)

### 2. Default Role Settings

| Role | view_all_clients | Description |
|------|------------------|-------------|
| ADMIN | ✅ true | Can view all clients |
| ADMINISTRATION | ✅ true | Can view all clients |
| INTERNAL | ❌ false | Only assigned/unassigned clients |
| EXTERNAL | ❌ false | Only assigned/unassigned clients |

### 3. Admin Panel Configuration

Administrators can modify these settings through the admin panel:
- Navigate to **Admin Dashboard**
- Find the **Role Permissions** section
- Toggle the `view_all_clients` permission for each role as needed

## Implementation Details

### Backend Protection

All client-related API endpoints now enforce visibility rules:

#### Main Client Routes
- `GET /api/clients` - Filters clients based on visibility permissions
- `GET /api/clients/[id]` - Checks if user can view specific client
- `PUT /api/clients/[id]` - Checks if user can edit specific client
- `DELETE /api/clients/[id]` - Checks if user can delete specific client

#### Import/Export Routes
- `GET /api/clients/export` - Only exports visible clients
- `POST /api/clients/import` - Imports with current user's permissions

### Frontend Integration

#### Visual Indicators
- **Client List Page**: Shows visibility status indicator
- **Individual Client Page**: Blocks access to unauthorized clients

#### Permission-Aware Components
- Action buttons only show when user has proper permissions
- Clear feedback when access is denied

### Technical Files

#### Core Utilities
- `/src/lib/client-visibility.ts` - Core visibility logic
- `/src/hooks/useClientVisibility.ts` - Frontend permission hooks
- `/src/components/ClientVisibilityIndicator.tsx` - UI indicators

#### API Integrations
- All client routes updated with visibility filters
- Consistent permission checking across all endpoints

## Usage Examples

### Admin Configuration

1. **Grant Full Access**: Set `view_all_clients = true` for a role
   - Users in this role will see all clients regardless of assignment

2. **Restrict to Assigned Only**: Set `view_all_clients = false` for a role
   - Users will only see clients where they are the assigned sales rep
   - Users will also see unassigned clients (for potential assignment)

### User Experience

#### User with `view_all_clients = true`:
- Sees indicator: "You can view all clients in the system"
- Can access any client detail page
- Export includes all clients

#### User with `view_all_clients = false`:
- Sees indicator: "You can only view clients assigned to you or unassigned clients"
- Cannot access client detail pages for clients assigned to others
- Export only includes their assigned clients + unassigned ones

## Security Benefits

1. **Data Isolation**: Sales reps can't see each other's clients
2. **Flexible Management**: Admins can easily adjust visibility rules
3. **Audit Trail**: All access attempts are logged
4. **Consistent Enforcement**: Both frontend and backend enforce the same rules

## Migration Notes

- Existing clients remain visible to all users until an admin adjusts role permissions
- No data migration required - the system works with existing client assignments
- Default permissions are automatically set up via the initialization script

## Testing

Run the initialization script to set up default permissions:
```bash
node src/scripts/init-client-visibility-permissions.js
```

Then test with different user roles to verify the visibility rules work as expected.
