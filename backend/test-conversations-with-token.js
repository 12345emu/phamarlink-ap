const axios = require('axios');

async function testConversationsWithToken() {
  try {
    console.log('🔍 Testing conversations endpoint with valid token...');
    
    // Use the same token from the logs
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsImlhdCI6MTc1ODEyOTYyNywiZXhwIjoxNzU4NzM0NDI3fQ.xZMrcNUhZfaPn3j-FQIx0cf8j24IBov6eEpNRP58pWg';
    
    const response = await axios.get('http://localhost:3000/api/chat/conversations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Conversations response received:', response.status);
    console.log('✅ Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Conversations test failed:', error.message);
    if (error.response) {
      console.log('❌ Response status:', error.response.status);
      console.log('❌ Response data:', error.response.data);
    }
  }
}

testConversationsWithToken();
