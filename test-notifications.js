const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAppointmentNotifications() {
  console.log('🧪 Testing Appointment Notifications...\n');

  try {
    // Test 1: Test appointment creation notification
    console.log('1. Testing appointment creation notification...');
    const testData1 = {
      doctorId: 1,
      patientName: 'John Doe',
      appointmentDate: '2024-01-15',
      appointmentTime: '10:00'
    };

    const response1 = await axios.post(`${BASE_URL}/api/test-appointment-notifications/test-appointment-creation`, testData1);
    console.log('✅ Appointment creation test:', response1.data);
    console.log('');

    // Test 2: Test appointment status notification
    console.log('2. Testing appointment status notification...');
    const testData2 = {
      patientId: 2,
      doctorName: 'Dr. Smith',
      appointmentDate: '2024-01-15',
      appointmentTime: '10:00',
      status: 'confirmed'
    };

    const response2 = await axios.post(`${BASE_URL}/api/test-appointment-notifications/test-appointment-status`, testData2);
    console.log('✅ Appointment status test:', response2.data);
    console.log('');

    // Test 3: Test appointment reschedule notification
    console.log('3. Testing appointment reschedule notification...');
    const testData3 = {
      doctorId: 1,
      patientName: 'Jane Smith',
      oldDate: '2024-01-15',
      oldTime: '10:00',
      newDate: '2024-01-16',
      newTime: '14:00'
    };

    const response3 = await axios.post(`${BASE_URL}/api/test-appointment-notifications/test-appointment-reschedule`, testData3);
    console.log('✅ Appointment reschedule test:', response3.data);
    console.log('');

    // Test 4: Test appointment cancellation notification
    console.log('4. Testing appointment cancellation notification...');
    const testData4 = {
      doctorId: 1,
      patientName: 'Mike Johnson',
      appointmentDate: '2024-01-15',
      appointmentTime: '10:00'
    };

    const response4 = await axios.post(`${BASE_URL}/api/test-appointment-notifications/test-appointment-cancellation`, testData4);
    console.log('✅ Appointment cancellation test:', response4.data);
    console.log('');

    console.log('🎉 All notification tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the tests
testAppointmentNotifications();
