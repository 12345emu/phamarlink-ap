const axios = require('axios');

async function triggerLoginDebug() {
  console.log('🔍 Triggering login to see debug logs...');
  
  try {
    const response = await axios.post('http://172.20.10.3:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful:', response.data);
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
  }
}

triggerLoginDebug();

