const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testServerStatus() {
  try {
    console.log('🔍 Testing server status...');
    
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health endpoint working:', healthResponse.data);
    
    // Test if cart endpoint exists (should return 401 for unauthorized, not 404)
    console.log('\n2. Testing cart endpoint...');
    try {
      const cartResponse = await axios.get(`${API_BASE_URL}/api/cart`);
      console.log('❌ Cart endpoint should require authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Cart endpoint exists (requires authentication)');
      } else if (error.response?.status === 404) {
        console.log('❌ Cart endpoint not found (404)');
      } else {
        console.log('❌ Cart endpoint error:', error.response?.status, error.response?.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Server test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Server is not running or not accessible');
    }
  }
}

testServerStatus(); 