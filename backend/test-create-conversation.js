const axios = require('axios');

async function testCreateConversation() {
  try {
    console.log('🔍 Testing create conversation endpoint...');
    
    // Use the same token from the logs
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsImlhdCI6MTc1ODEyOTYyNywiZXhwIjoxNzU4NzM0NDI3fQ.xZMrcNUhZfaPn3j-FQIx0cf8j24IBov6eEpNRP58pWg';
    
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

testCreateConversation();
