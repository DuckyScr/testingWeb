const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeClientVisibilityPermissions() {
  try {
    console.log('Initializing client visibility permissions...');

    // Define default permission settings for each role
    const rolePermissions = [
      // ADMIN role - can view all clients
      { role: 'ADMIN', permission: 'view_all_clients', allowed: true },
      
      // ADMINISTRATION role - can view all clients  
      { role: 'ADMINISTRATION', permission: 'view_all_clients', allowed: true },
      
      // INTERNAL role - can only view assigned clients (false means restricted)
      { role: 'INTERNAL', permission: 'view_all_clients', allowed: false },
      
      // EXTERNAL role - can only view assigned clients (false means restricted)
      { role: 'EXTERNAL', permission: 'view_all_clients', allowed: false },
    ];

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
    }

    console.log('Client visibility permissions initialized successfully!');
    console.log('\nSummary:');
    console.log('- ADMIN & ADMINISTRATION: Can view ALL clients');
    console.log('- INTERNAL & EXTERNAL: Can only view assigned clients or unassigned clients');
    
  } catch (error) {
    console.error('Error initializing permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
initializeClientVisibilityPermissions();
