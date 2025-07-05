const XLSX = require('xlsx');
const path = require('path');

// Create test data for import
const testData = [
  {
    companyName: 'Test Company 1',
    ico: '12345678',
    fveName: 'Solar Plant 1',
    installedPower: 100.5,
    salesRepName: 'Admin User', // This should match a user in the system
    contactPerson: 'Jane Smith',
    phone: '+420123456789',
    email: 'jane@testcompany1.com',
    fveAddress: 'Test Address 1, Prague',
    parentCompany: 'Parent Corp 1',
    dataBox: 'abc123'
  },
  {
    companyName: 'Test Company 2',
    ico: '87654321',
    fveName: 'Solar Plant 2',
    installedPower: 250.75,
    salesRep: 'admin@dronetech.cz', // Try matching by email
    contactPerson: 'Bob Johnson',
    phone: '+420987654321',
    email: 'bob@testcompany2.com',
    fveAddress: 'Test Address 2, Brno',
    parentCompany: 'Parent Corp 2',
    dataBox: 'xyz789'
  },
  {
    companyName: 'Test Company 1 Updated', // This should update the first company (same ICO)
    ico: '12345678', // Same ICO as first company - should update
    fveName: 'Solar Plant 1 UPDATED',
    installedPower: 150.25,
    obchodniZastupce: 'Andrej Burkon', // Try another field name for sales rep
    contactPerson: 'Jane Smith Updated',
    phone: '+420123456999',
    email: 'jane.updated@testcompany1.com',
    fveAddress: 'Updated Address 1, Prague',
    parentCompany: 'Updated Parent Corp 1',
    dataBox: 'abc123updated'
  },
  {
    companyName: 'Test Company 3',
    ico: '11111111',
    fveName: 'Solar Plant 3',
    installedPower: 75.5,
    salesRepName: 'NonExistentUser', // This user doesn't exist - should fall back to current user
    contactPerson: 'Alice Brown',
    phone: '+420555666777',
    email: 'alice@testcompany3.com',
    fveAddress: 'Test Address 3, Ostrava'
  }
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(testData);

// Add the worksheet to the workbook
XLSX.utils.book_append_sheet(wb, ws, 'Clients');

// Write the file
const fileName = 'test-import-clients.xlsx';
XLSX.writeFile(wb, fileName);

console.log('Test import file created:', fileName);
console.log('\nTest scenarios:');
console.log('1. New client with sales rep name matching');
console.log('2. New client with sales rep email matching');
console.log('3. Duplicate client (same ICO) - should update existing');
console.log('4. Client with non-existent sales rep - should fall back to current user');
console.log('\nExpected results:');
console.log('- 3 new clients created');
console.log('- 1 existing client updated');
console.log('- Sales reps matched where possible');
console.log('- No errors if users exist in system');

console.log('\nTo test:');
console.log('1. Upload the generated test-import-clients.xlsx file through the import UI');
console.log('2. Check the import results in the response');
console.log('3. Verify that clients are created/updated correctly');
console.log('4. Check that sales rep assignments work as expected');
