const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Checking users in database for sales rep matching tests...\n');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });
    
    console.log('Current users in the system:');
    console.log('============================');
    
    if (users.length === 0) {
      console.log('No users found in the database.');
      console.log('Please create some users first through the admin panel.');
      return;
    }
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Name: "${user.name || 'No name'}", Email: "${user.email}", Role: ${user.role}`);
    });
    
    console.log('\nTesting sales rep matching:');
    console.log('===========================');
    
    // Test the matching logic
    const testNames = [
      'John Doe',
      'admin@example.com',
      'Admin User',
      'NonExistentUser'
    ];
    
    // Simulate the findSalesRepByName function
    const findSalesRepByName = (salesRepName) => {
      if (!salesRepName || typeof salesRepName !== 'string') {
        return null;
      }
      
      const trimmedName = salesRepName.trim();
      if (!trimmedName) {
        return null;
      }
      
      // Try exact match first (case insensitive)
      let user = users.find(u => 
        u.name && u.name.toLowerCase() === trimmedName.toLowerCase()
      );
      
      // If no exact match, try partial match
      if (!user) {
        user = users.find(u => 
          u.name && (
            u.name.toLowerCase().includes(trimmedName.toLowerCase()) ||
            trimmedName.toLowerCase().includes(u.name.toLowerCase())
          )
        );
      }
      
      // Try matching by email as well
      if (!user) {
        user = users.find(u => 
          u.email.toLowerCase() === trimmedName.toLowerCase()
        );
      }
      
      return user;
    };
    
    testNames.forEach(testName => {
      const foundUser = findSalesRepByName(testName);
      if (foundUser) {
        console.log(`✓ "${testName}" → Found: ${foundUser.name || foundUser.email} (${foundUser.email})`);
      } else {
        console.log(`✗ "${testName}" → Not found (will fallback to current user)`);
      }
    });
    
    console.log('\nRecommendations for test file:');
    console.log('==============================');
    
    if (users.length > 0) {
      console.log('Update the test-import.js file with these actual user names/emails:');
      users.forEach((user, index) => {
        if (index < 3) { // Show first 3 users
          console.log(`- salesRepName: "${user.name || user.email}"`);
        }
      });
    }
    
    console.log('\nThe import test file contains these sales rep references:');
    console.log('- "John Doe" (may not exist)');
    console.log('- "admin@example.com" (may exist)');
    console.log('- "Admin User" (may exist)');
    console.log('- "NonExistentUser" (should not exist)');
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
