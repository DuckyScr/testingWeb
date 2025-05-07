import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createUser() {
  try {
    // Hash the password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the user
    const user = await prisma.user.upsert({
      where: { email: 'admin@dronetech.cz' },
      update: {}, // If the user exists, don't update anything
      create: {
        email: 'admin@dronetech.cz',
        name: 'Admin User',
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    
    console.log('User created successfully:');
    console.log({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    
    console.log('\nYou can now log in with:');
    console.log('Email: admin@dronetech.cz');
    console.log('Password: admin123');

    // Ensure proper cleanup
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Add error handling for unhandled rejections
process.on('unhandledRejection', async (error) => {
  console.error('Unhandled rejection:', error);
  await prisma.$disconnect();
  process.exit(1);
});

createUser();