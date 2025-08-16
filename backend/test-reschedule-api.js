const axios = require('axios');

async function testRescheduleAPI() {
  try {
    console.log('🧪 Testing appointment reschedule API...');
    
    // Test data
    const appointmentId = 1; // Use an existing appointment ID
    const rescheduleData = {
      rescheduled_date: '2025-01-30',
      rescheduled_time: '14:00',
      notes: 'Test reschedule from API'
    };
    
    console.log('📝 Rescheduling appointment with data:', JSON.stringify(rescheduleData, null, 2));
    
    const response = await axios.patch(`http://localhost:3000/api/appointments/${appointmentId}/reschedule`, rescheduleData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail, but let's see the response
      }
    });
    
    console.log('✅ Appointment rescheduled successfully!');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing reschedule API:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 The backend server is not running. Please start it with: node server.js');
    } else if (error.response?.status === 401) {
      console.log('🔐 Authentication required - this is expected without a valid token');
      console.log('📊 Response structure:', JSON.stringify(error.response.data, null, 2));
    } else if (error.response?.status === 404) {
      console.log('📋 Appointment not found - this is expected if appointment ID 1 does not exist');
      console.log('📊 Response structure:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testRescheduleAPI(); 