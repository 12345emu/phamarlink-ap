const axios = require('axios');

async function testConversationCreation() {
  try {
    console.log('🔍 Testing conversation creation...');
    
    // First, let's get a fresh token by logging in
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@pharmalink.com',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, got token:', token.substring(0, 50) + '...');
    
    // Now test conversation creation
    const conversationData = {
      facility_id: 1, // Test facility ID
      subject: 'Test conversation',
      initial_message: 'This is a test message to start a conversation',
      message_type: 'general'
    };
    
    console.log('🔍 Sending conversation data:', conversationData);
    
    const response = await axios.post('http://localhost:3000/api/chat/conversations', conversationData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Create conversation response received:', response.status);
    console.log('✅ Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Create conversation test failed:', error.message);
    if (error.response) {
      console.log('❌ Response status:', error.response.status);
      console.log('❌ Response data:', error.response.data);
    }
  }
}

testConversationCreation();





