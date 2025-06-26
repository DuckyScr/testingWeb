export const PERMISSIONS = {
  // Client Management
  VIEW_CLIENTS: 'view_clients',
  ADD_CLIENT: 'add_client',
  EDIT_CLIENT: 'edit_client',
  DELETE_CLIENT: 'delete_clients',
  IMPORT_CLIENTS: 'import_clients',
  EXPORT_CLIENTS: 'export_clients',

  // Drone Sales Management
  VIEW_DRONE_SALES: 'view_drone_sales',
  CREATE_DRONE_SALE: 'create_drone_sale',
  EDIT_DRONE_SALE_NAME: 'edit_drone_sale_name',
  EDIT_DRONE_SALE_CONTACT: 'edit_drone_sale_contact',
  EDIT_DRONE_SALE_STATUS: 'edit_drone_sale_status',
  DELETE_DRONE_SALE: 'delete_drone_sale',
  EXPORT_DRONE_SALES: 'export_drone_sales',

  // Admin Management
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  MANAGE_PERMISSIONS: 'manage_permissions',
  VIEW_LOGS: 'view_logs',

  // System Management
  ADMIN: 'admin',
  SYSTEM_ADMIN: 'system_admin',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
