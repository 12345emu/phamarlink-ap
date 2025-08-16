const axios = require('axios');

// Test with the same base URL as the app
const API_BASE_URL = 'http://172.20.10.3:3000/api';

async function testCartURL() {
  try {
    console.log('🔍 Testing cart URL...');
    console.log('Base URL:', API_BASE_URL);
    
    // Test the exact URL that the cart service uses
    const cartUrl = `${API_BASE_URL}/cart`;
    console.log('Cart URL:', cartUrl);
    
    // Test without authentication first
    try {
      const response = await axios.get(cartUrl);
      console.log('❌ Should require authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Cart endpoint exists and requires authentication');
      } else if (error.response?.status === 404) {
        console.log('❌ Cart endpoint not found (404)');
        console.log('   Full URL:', error.config?.url);
      } else {
        console.log('❌ Other error:', error.response?.status, error.response?.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Server is not running or not accessible');
    }
  }
}

testCartURL(); 