const axios = require('axios');

async function testConversationsEndpoint() {
  try {
    console.log('🔍 Testing conversations endpoint...');
    
    // First, let's test if the server is running
    const healthCheck = await axios.get('http://localhost:3000/api/health');
    console.log('✅ Server is running:', healthCheck.status);
    
    // Test conversations endpoint without auth (should fail)
    try {
      const response = await axios.get('http://localhost:3000/api/chat/conversations');
      console.log('❌ Unexpected success without auth:', response.data);
    } catch (error) {
      console.log('✅ Correctly rejected without auth:', error.response?.status, error.response?.data);
    }
    
    // Test with a dummy token
    try {
      const response = await axios.get('http://localhost:3000/api/chat/conversations', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      console.log('❌ Unexpected success with invalid token:', response.data);
    } catch (error) {
      console.log('✅ Correctly rejected with invalid token:', error.response?.status, error.response?.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running on port 3000');
    }
  }
}

testConversationsEndpoint();
