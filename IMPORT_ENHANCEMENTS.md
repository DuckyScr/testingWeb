# Client Import Enhancements

## Overview

The client import functionality has been significantly enhanced to handle duplicate clients and sales representative matching. The system now provides robust duplicate detection, data overwriting, and intelligent sales rep assignment.

## Key Features

### 1. Duplicate Detection & Overwriting

- **Detection Method**: Clients are identified as duplicates based on their ICO (company identification number)
- **Overwrite Behavior**: When a duplicate is found, the existing client record is completely updated with the new data from the import file
- **No Data Loss**: Original client ID and relationships are preserved during updates

### 2. Sales Representative Matching

The system now supports multiple field names for sales representative assignment and uses intelligent matching:

#### Supported Field Names
- `salesRepName` - Primary field for sales rep name
- `salesRep` - Alternative field name  
- `obchodniZastupce` - Czech language field name

#### Matching Algorithm
1. **Exact Name Match** (case-insensitive): Matches user's full name exactly
2. **Partial Name Match**: Finds users whose names contain the search term or vice versa
3. **Email Match**: Matches against user's email address
4. **Fallback**: If no match found, assigns to the current importing user

### 3. Enhanced Result Reporting

The import now provides detailed statistics:

```javascript
{
  success: true,
  imported: 2,      // New clients created
  updated: 1,       // Existing clients updated
  total: 3,         // Total rows processed
  errors: [],       // Any errors encountered
  summary: {
    newClients: 2,
    updatedClients: 1,
    errorCount: 0,
    totalProcessed: 3
  }
}
```

## Technical Implementation

### Backend Changes

#### Import Route (`/src/app/api/clients/import/route.ts`)

**Key additions:**
- User fetching for sales rep matching
- Duplicate detection using ICO lookup
- Enhanced sales rep matching function
- Update vs create logic
- Detailed result tracking

**Sales Rep Matching Function:**
```javascript
const findSalesRepByName = (salesRepName) => {
  // Exact match (case-insensitive)
  let user = allUsers.find(u => 
    u.name && u.name.toLowerCase() === trimmedName.toLowerCase()
  );
  
  // Partial match
  if (!user) {
    user = allUsers.find(u => 
      u.name && (
        u.name.toLowerCase().includes(trimmedName.toLowerCase()) ||
        trimmedName.toLowerCase().includes(u.name.toLowerCase())
      )
    );
  }
  
  // Email match
  if (!user) {
    user = allUsers.find(u => 
      u.email.toLowerCase() === trimmedName.toLowerCase()
    );
  }
  
  return user;
};
```

### Frontend Changes

#### XLSX Import Component (`/src/components/xlsx-import.tsx`)

**Enhanced result display:**
- Shows count of new clients created
- Shows count of existing clients updated
- Displays error count if any
- Provides detailed success/warning messages

## Testing

### Test File Generation

A comprehensive test file has been created that includes:

1. **New Client with Name Matching**: Tests exact name match for sales rep
2. **New Client with Email Matching**: Tests email-based sales rep matching  
3. **Duplicate Client Update**: Tests overwriting behavior using same ICO
4. **Fallback Assignment**: Tests behavior when sales rep not found

### Test Data Structure

```javascript
[
  {
    companyName: 'Test Company 1',
    ico: '12345678',
    salesRepName: 'Admin User',    // Exact name match
    // ... other fields
  },
  {
    companyName: 'Test Company 2', 
    ico: '87654321',
    salesRep: 'admin@dronetech.cz', // Email match
    // ... other fields
  },
  {
    companyName: 'Test Company 1 Updated',
    ico: '12345678',              // Same ICO - should update
    obchodniZastupce: 'Andrej Burkon', // Different field name
    // ... other fields
  }
]
```

## Usage Instructions

### For End Users

1. **Prepare Excel File**: Ensure your XLSX file contains the required columns (`companyName`, `ico`)
2. **Sales Rep Assignment**: Use any of these column names for sales rep assignment:
   - `salesRepName` - User's full name
   - `salesRep` - User's name or email
   - `obchodniZastupce` - Czech variant
3. **Upload File**: Use the import feature in the clients page
4. **Review Results**: Check the success message for detailed import statistics

### For Developers

1. **Run Tests**: Use the generated test file to verify functionality
2. **Check Logs**: Review console output for debugging sales rep matching
3. **Monitor Results**: Verify that duplicates are properly updated and sales reps are correctly assigned

## Benefits

1. **Data Consistency**: Eliminates duplicate clients in the system
2. **Flexible Assignment**: Multiple ways to specify sales representatives
3. **User-Friendly**: Clear feedback on import results
4. **Robust Matching**: Intelligent algorithms for finding correct users
5. **Audit Trail**: Detailed logging of import operations
6. **Error Handling**: Graceful handling of missing or invalid data

## File Locations

- **Backend Logic**: `/src/app/api/clients/import/route.ts`
- **Frontend Component**: `/src/components/xlsx-import.tsx` 
- **Test Generator**: `/test-import.js`
- **Test File**: `/test-import-clients.xlsx`
- **Verification**: `/verify-import-changes.js`
- **User Checker**: `/check-users-for-testing.js`

The enhanced import system is now ready for production use and provides a much more robust and user-friendly import experience.
