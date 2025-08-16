const axios = require('axios');

async function simpleTest() {
  try {
    console.log('🔍 Testing server connection...');
    
    // Test if server is responding
    const response = await axios.get('http://localhost:3000/health');
    console.log('✅ Server is responding:', response.data);
    
  } catch (error) {
    console.error('❌ Server error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running on port 3000');
    }
  }
}

simpleTest(); 