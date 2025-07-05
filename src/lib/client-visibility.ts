import { hasPermission } from './permissions';

/**
 * Check if a user can view a specific client based on their permissions and client assignment
 * @param userRole The user's role
 * @param userId The user's ID
 * @param clientSalesRepId The client's assigned sales rep ID (null if unassigned)
 * @returns Promise<boolean> True if user can view the client
 */
export async function canViewClient(
  userRole: string,
  userId: string,
  clientSalesRepId: string | null
): Promise<boolean> {
  // Check if user has basic view clients permission
  const hasBasicViewPermission = await hasPermission(userRole, 'view_clients');
  if (!hasBasicViewPermission) {
    return false;
  }

  // Check if user has permission to view all clients
  const canViewAllClients = await hasPermission(userRole, 'view_all_clients');
  if (canViewAllClients) {
    return true;
  }

  // If user doesn't have view_all_clients permission, they can only see:
  // 1. Clients assigned to them
  // 2. Unassigned clients (where salesRepId is null)
  return clientSalesRepId === null || clientSalesRepId === userId;
}

/**
 * Get the WHERE clause filter for client queries based on user permissions
 * @param userRole The user's role
 * @param userId The user's ID
 * @returns Promise<object> Prisma WHERE clause object
 */
export async function getClientVisibilityFilter(
  userRole: string,
  userId: string
): Promise<object> {
  // Check if user can view all clients
  const canViewAllClients = await hasPermission(userRole, 'view_all_clients');
  
  if (canViewAllClients) {
    // Return empty filter (no restrictions)
    return {};
  }

  // Return filter for only assigned clients or unassigned ones
  return {
    OR: [
      { salesRepId: userId },
      { salesRepId: null }
    ]
  };
}

/**
 * Filter an array of clients based on user visibility permissions
 * @param clients Array of client objects
 * @param userRole The user's role
 * @param userId The user's ID
 * @returns Promise<Array> Filtered array of clients
 */
export async function filterClientsByVisibility<T extends { salesRepId?: string | null }>(
  clients: T[],
  userRole: string,
  userId: string
): Promise<T[]> {
  const canViewAllClients = await hasPermission(userRole, 'view_all_clients');
  
  if (canViewAllClients) {
    return clients;
  }

  return clients.filter(client => 
    client.salesRepId === null || client.salesRepId === userId
  );
}
