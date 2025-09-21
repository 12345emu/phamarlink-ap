const axios = require('axios');

async function testWithToken() {
  try {
    console.log('🔍 Testing with a valid token...');
    
    // Create a test token (same as in the frontend)
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign(
      { 
        userId: 4, // Test user ID
        email: 'test@example.com',
        user_type: 'patient'
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    console.log('🔍 Test token created:', testToken.substring(0, 50) + '...');
    
    // Test conversations endpoint with valid token
    const response = await axios.get('http://localhost:3000/api/chat/conversations', {
      headers: {
        'Authorization': `Bearer ${testToken}`
      }
    });
    
    console.log('✅ Response received:', response.status);
    console.log('✅ Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('❌ Response status:', error.response.status);
      console.log('❌ Response data:', error.response.data);
    }
  }
}

testWithToken();
