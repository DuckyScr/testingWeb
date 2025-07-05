import { PERMISSIONS } from './permissions-list';

// Map client fields to their specific permissions
export const CLIENT_FIELD_PERMISSIONS: Record<string, string> = {
  // Name/Company related fields
  companyName: PERMISSIONS.EDIT_CLIENT_NAME,
  ico: PERMISSIONS.EDIT_CLIENT_NAME,
  parentCompany: PERMISSIONS.EDIT_CLIENT_NAME,
  parentCompanyIco: PERMISSIONS.EDIT_CLIENT_NAME,
  fveName: PERMISSIONS.EDIT_CLIENT_NAME,
  
  // Contact related fields
  contactPerson: PERMISSIONS.EDIT_CLIENT_CONTACT,
  phone: PERMISSIONS.EDIT_CLIENT_CONTACT,
  email: PERMISSIONS.EDIT_CLIENT_CONTACT,
  contactRole: PERMISSIONS.EDIT_CLIENT_CONTACT,
  salesRepId: PERMISSIONS.EDIT_CLIENT_CONTACT,
  salesRepEmail: PERMISSIONS.EDIT_CLIENT_CONTACT,
  
  // Address related fields
  fveAddress: PERMISSIONS.EDIT_CLIENT_ADDRESS,
  gpsCoordinates: PERMISSIONS.EDIT_CLIENT_ADDRESS,
  dataBox: PERMISSIONS.EDIT_CLIENT_ADDRESS,
  
  // Status related fields
  status: PERMISSIONS.EDIT_CLIENT_STATUS,
  marketingBan: PERMISSIONS.EDIT_CLIENT_STATUS,
  
  // Document related fields
  flightConsentSent: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  flightConsentSentDate: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  flightConsentSigned: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  flightConsentSignedDate: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  fveDrawingsReceived: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  fveDrawingsReceivedDate: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  permissionRequired: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  permissionRequested: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  permissionRequestedDate: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  permissionRequestNumber: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  permissionStatus: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  permissionValidUntil: PERMISSIONS.EDIT_CLIENT_DOCUMENTS,
  
  // Invoice related fields
  firstInvoiceAmount: PERMISSIONS.EDIT_CLIENT_INVOICES,
  firstInvoiceDate: PERMISSIONS.EDIT_CLIENT_INVOICES,
  firstInvoiceDueDate: PERMISSIONS.EDIT_CLIENT_INVOICES,
  firstInvoicePaid: PERMISSIONS.EDIT_CLIENT_INVOICES,
  secondInvoiceAmount: PERMISSIONS.EDIT_CLIENT_INVOICES,
  secondInvoiceDate: PERMISSIONS.EDIT_CLIENT_INVOICES,
  secondInvoiceDueDate: PERMISSIONS.EDIT_CLIENT_INVOICES,
  secondInvoicePaid: PERMISSIONS.EDIT_CLIENT_INVOICES,
  finalInvoiceAmount: PERMISSIONS.EDIT_CLIENT_INVOICES,
  finalInvoiceDate: PERMISSIONS.EDIT_CLIENT_INVOICES,
  finalInvoiceDueDate: PERMISSIONS.EDIT_CLIENT_INVOICES,
  finalInvoicePaid: PERMISSIONS.EDIT_CLIENT_INVOICES,
  totalPriceExVat: PERMISSIONS.EDIT_CLIENT_INVOICES,
  totalPriceIncVat: PERMISSIONS.EDIT_CLIENT_INVOICES,
  readyForBilling: PERMISSIONS.EDIT_CLIENT_INVOICES,
};

// For fields that don't have specific permissions, default to general edit permission
export const getFieldPermission = (fieldName: string): string => {
  return CLIENT_FIELD_PERMISSIONS[fieldName] || PERMISSIONS.EDIT_CLIENTS;
};

/**
 * Check if a user has permission to edit specific fields
 * @param userRole The user's role
 * @param fields Array of field names to check
 * @param hasPermissionFn Function to check if user has a specific permission
 * @returns Object with field names as keys and boolean permission status as values
 */
export async function checkFieldPermissions(
  userRole: string,
  fields: string[],
  hasPermissionFn: (role: string, permission: string) => Promise<boolean>
): Promise<Record<string, boolean>> {
  const permissions: Record<string, boolean> = {};
  
  for (const field of fields) {
    const requiredPermission = getFieldPermission(field);
    permissions[field] = await hasPermissionFn(userRole, requiredPermission);
  }
  
  return permissions;
}

/**
 * Filter data based on field permissions
 * @param data The data object to filter
 * @param allowedFields Array of field names that are allowed to be modified
 * @returns Filtered data object containing only allowed fields
 */
export function filterDataByPermissions(
  data: Record<string, any>,
  allowedFields: string[]
): Record<string, any> {
  const filteredData: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      filteredData[key] = value;
    }
  }
  
  return filteredData;
}
