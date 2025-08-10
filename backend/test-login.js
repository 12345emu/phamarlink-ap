const axios = require('axios');

async function testLogin() {
  try {
    console.log('🧪 Testing login endpoint...');
    console.log('📍 URL: http://172.20.10.3:3000/api/auth/login');
    
    const response = await axios.post('http://172.20.10.3:3000/api/auth/login', {
      email: 'test@pharmalink.com',
      password: 'password123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Login successful!');
    console.log('📊 Response status:', response.status);
    console.log('📝 Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Login failed!');
    
    if (error.response) {
      // Server responded with error status
      console.log('📊 Error status:', error.response.status);
      console.log('📝 Error data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // Network error
      console.log('🌐 Network error:', error.message);
      console.log('🔍 Request details:', error.request);
    } else {
      // Other error
      console.log('💥 Error:', error.message);
    }
  }
}

testLogin(); 