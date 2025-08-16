const axios = require('axios');

async function testSlots() {
  try {
    console.log('🔍 Testing slots endpoint...');
    
    // Test with a facility ID and date
    const facilityId = 12; // Use a facility that exists
    const date = '2025-08-20'; // Use a future date
    
    const response = await axios.get(
      `http://localhost:3000/api/appointments/facility/${facilityId}/slots?date=${date}`
    );
    
    console.log('✅ Slots response:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
  }
}

testSlots(); 