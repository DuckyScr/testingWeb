const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testImportAPI() {
  try {
    console.log('Testing import API...\n');
    
    // First, let's check if the test file exists
    const testFile = 'test-import-clients.xlsx';
    if (!fs.existsSync(testFile)) {
      console.error('Test file not found. Please run "node test-import.js" first.');
      return;
    }
    
    // Read the test file
    const fileBuffer = fs.readFileSync(testFile);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: testFile,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    // For testing, we'll need a valid auth token
    // This would normally come from logging in through the frontend
    console.log('Note: This test requires a valid auth token.');
    console.log('To properly test:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Login through the web interface');
    console.log('3. Use the browser dev tools to get the auth-token cookie');
    console.log('4. Use the import UI to test the functionality');
    console.log('\\nOr run this test with a valid token...');
    
    // The actual API call would look like this:
    /*
    const response = await fetch('http://localhost:3000/api/clients/import', {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': 'auth-token=YOUR_TOKEN_HERE'
      }
    });
    
    const result = await response.json();
    console.log('Import result:', JSON.stringify(result, null, 2));
    */
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Helper function to check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET'
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('Import API Test Script');
  console.log('====================\\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('Development server is not running.');
    console.log('Please start it with: npm run dev');
    return;
  }
  
  await testImportAPI();
}

main();
