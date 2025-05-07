import { prisma } from "./prisma";

/**
 * Checks if a user with the given role has the specified permission
 * @param role The user's role (e.g., "ADMIN", "USER", "MANAGER")
 * @param permission The permission to check (e.g., "edit_clients", "delete_users")
 * @returns Promise<boolean> True if the user has permission, false otherwise
 */
export async function hasPermission(role: string, permission: string): Promise<boolean> {
  // Admins have all permissions by default
  if (role === "ADMIN") {
    return true;
  }
  
  try {
    const permissionRecord = await prisma.rolePermission.findUnique({
      where: {
        role_permission: {
          role,
          permission
        }
      }
    });
    
    // If the permission record exists and is allowed, return true
    return permissionRecord?.allowed === true;
  } catch (error) {
    console.error(`Error checking permission ${permission} for role ${role}:`, error);
    return false;
  }
}