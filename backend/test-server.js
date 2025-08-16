const axios = require('axios');

async function testServer() {
  try {
    console.log('🔍 Testing login...');
    
    // Test login with the correct user
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@pharmalink.com',
      password: 'password123'
    });
    
    console.log('✅ Login response:', loginResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running on port 3000');
    }
  }
}

testServer(); 