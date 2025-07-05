const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeDroneSalesPermissions() {
  try {
    console.log('Initializing drone sales permissions...\n');

    // Define default permission settings for each role
    const rolePermissions = [
      // ADMIN role - full access to everything
      { role: 'ADMIN', permission: 'view_drone_sales', allowed: true },
      { role: 'ADMIN', permission: 'create_drone_sale', allowed: true },
      { role: 'ADMIN', permission: 'edit_drone_sale_name', allowed: true },
      { role: 'ADMIN', permission: 'edit_drone_sale_contact', allowed: true },
      { role: 'ADMIN', permission: 'edit_drone_sale_status', allowed: true },
      { role: 'ADMIN', permission: 'delete_drone_sale', allowed: true },
      { role: 'ADMIN', permission: 'export_drone_sales', allowed: true },
      
      // ADMINISTRATION role - full access to everything (similar to admin)
      { role: 'ADMINISTRATION', permission: 'view_drone_sales', allowed: true },
      { role: 'ADMINISTRATION', permission: 'create_drone_sale', allowed: true },
      { role: 'ADMINISTRATION', permission: 'edit_drone_sale_name', allowed: true },
      { role: 'ADMINISTRATION', permission: 'edit_drone_sale_contact', allowed: true },
      { role: 'ADMINISTRATION', permission: 'edit_drone_sale_status', allowed: true },
      { role: 'ADMINISTRATION', permission: 'delete_drone_sale', allowed: true },
      { role: 'ADMINISTRATION', permission: 'export_drone_sales', allowed: true },
      
      // INTERNAL role - can view, create, and edit but not delete
      { role: 'INTERNAL', permission: 'view_drone_sales', allowed: true },
      { role: 'INTERNAL', permission: 'create_drone_sale', allowed: true },
      { role: 'INTERNAL', permission: 'edit_drone_sale_name', allowed: true },
      { role: 'INTERNAL', permission: 'edit_drone_sale_contact', allowed: true },
      { role: 'INTERNAL', permission: 'edit_drone_sale_status', allowed: true },
      { role: 'INTERNAL', permission: 'delete_drone_sale', allowed: false },
      { role: 'INTERNAL', permission: 'export_drone_sales', allowed: true },
      
      // EXTERNAL role - limited access (view and basic editing only)
      { role: 'EXTERNAL', permission: 'view_drone_sales', allowed: true },
      { role: 'EXTERNAL', permission: 'create_drone_sale', allowed: false },
      { role: 'EXTERNAL', permission: 'edit_drone_sale_name', allowed: false },
      { role: 'EXTERNAL', permission: 'edit_drone_sale_contact', allowed: true },
      { role: 'EXTERNAL', permission: 'edit_drone_sale_status', allowed: false },
      { role: 'EXTERNAL', permission: 'delete_drone_sale', allowed: false },
      { role: 'EXTERNAL', permission: 'export_drone_sales', allowed: false },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const { role, permission, allowed } of rolePermissions) {
      // Check if permission already exists
      const existingPermission = await prisma.rolePermission.findUnique({
        where: {
          role_permission: {
            role,
            permission
          }
        }
      });

      if (existingPermission) {
        console.log(`Permission ${permission} for ${role} already exists, skipping...`);
        skippedCount++;
        continue;
      }

      // Create the permission
      await prisma.rolePermission.create({
        data: {
          role,
          permission,
          allowed
        }
      });

      console.log(`✓ Created permission: ${role} -> ${permission} = ${allowed}`);
      createdCount++;
    }

    console.log('\nDrone sales permissions initialized successfully!');
    console.log(`\nSummary:`);
    console.log(`- Created: ${createdCount} permissions`);
    console.log(`- Skipped: ${skippedCount} permissions (already existed)`);
    
    console.log('\nPermission Matrix:');
    console.log('==================');
    console.log('| Permission                  | ADMIN | ADMINISTRATION | INTERNAL | EXTERNAL |');
    console.log('|-----------------------------|-------|----------------|----------|----------|');
    console.log('| view_drone_sales           |   ✅   |       ✅        |    ✅     |    ✅     |');
    console.log('| create_drone_sale          |   ✅   |       ✅        |    ✅     |    ❌     |');
    console.log('| edit_drone_sale_name       |   ✅   |       ✅        |    ✅     |    ❌     |');
    console.log('| edit_drone_sale_contact    |   ✅   |       ✅        |    ✅     |    ✅     |');
    console.log('| edit_drone_sale_status     |   ✅   |       ✅        |    ✅     |    ❌     |');
    console.log('| delete_drone_sale          |   ✅   |       ✅        |    ❌     |    ❌     |');
    console.log('| export_drone_sales         |   ✅   |       ✅        |    ✅     |    ❌     |');
    
  } catch (error) {
    console.error('Error initializing permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
initializeDroneSalesPermissions();
