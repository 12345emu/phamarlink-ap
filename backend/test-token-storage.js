const axios = require('axios');

async function testTokenStorage() {
  try {
    console.log('🔍 Testing token storage and retrieval...');
    
    // Test 1: Try to login and get a token
    console.log('\n📝 Testing login to get token...');
    try {
      const loginResponse = await axios.post('http://172.20.10.3:3000/api/auth/login', {
        email: 'testpatient@example.com',
        password: 'password'
      });
      
      if (loginResponse.data.success) {
        console.log('✅ Login successful!');
        console.log('Token received:', loginResponse.data.data.token ? 'YES' : 'NO');
        console.log('User data received:', loginResponse.data.data.user ? 'YES' : 'NO');
        
        const token = loginResponse.data.data.token;
        const user = loginResponse.data.data.user;
        
        console.log('User ID:', user.id);
        console.log('User Type:', user.user_type);
        
        // Test 2: Use the token to create an appointment
        console.log('\n📅 Testing appointment creation with valid token...');
        try {
          const appointmentData = {
            facility_id: 12,
            appointment_date: '2025-01-20',
            appointment_time: '09:00',
            appointment_type: 'consultation',
            reason: 'Test appointment creation with valid token',
            symptoms: ['test symptom'],
            notes: 'Test notes'
          };
          
          const createResponse = await axios.post('http://172.20.10.3:3000/api/appointments', appointmentData, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('✅ Appointment created successfully!');
          console.log('Response:', JSON.stringify(createResponse.data, null, 2));
          
        } catch (error) {
          console.error('❌ Appointment creation failed:', error.response?.data || error.message);
          console.error('Status:', error.response?.status);
        }
        
      } else {
        console.error('❌ Login failed:', loginResponse.data.message);
      }
      
    } catch (error) {
      console.error('❌ Login error:', error.response?.data || error.message);
    }
    
    // Test 3: Check what users exist in the database
    console.log('\n👥 Checking available users...');
    try {
      const usersResponse = await axios.get('http://172.20.10.3:3000/api/users');
      console.log('Users response:', JSON.stringify(usersResponse.data, null, 2));
    } catch (error) {
      console.error('❌ Users check failed:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

testTokenStorage(); 