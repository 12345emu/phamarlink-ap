const axios = require('axios');

async function testCancelAppointmentAPI() {
  try {
    console.log('🔍 Testing cancel appointment API endpoint...');
    
    // First, let's get a valid token by logging in
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'testpatient@example.com',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token obtained');
    
    // Get user's appointments
    const appointmentsResponse = await axios.get('http://localhost:3000/api/appointments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!appointmentsResponse.data.success) {
      console.log('❌ Failed to get appointments:', appointmentsResponse.data.message);
      return;
    }
    
    const appointments = appointmentsResponse.data.data.appointments;
    console.log('📋 User appointments:', appointments.length);
    
    if (appointments.length === 0) {
      console.log('❌ No appointments found');
      return;
    }
    
    // Find an appointment that's not already cancelled
    const appointmentToCancel = appointments.find(apt => apt.status !== 'cancelled');
    
    if (!appointmentToCancel) {
      console.log('❌ No non-cancelled appointments found');
      return;
    }
    
    console.log('🎯 Testing cancellation for appointment:', {
      id: appointmentToCancel.id,
      status: appointmentToCancel.status,
      date: appointmentToCancel.appointment_date,
      time: appointmentToCancel.appointment_time
    });
    
    // Test the cancel endpoint
    const cancelResponse = await axios.patch(
      `http://localhost:3000/api/appointments/${appointmentToCancel.id}/cancel`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Cancel API response:', cancelResponse.data);
    
    // Verify the appointment was cancelled by fetching it again
    const verifyResponse = await axios.get(`http://localhost:3000/api/appointments/${appointmentToCancel.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (verifyResponse.data.success) {
      const updatedAppointment = verifyResponse.data.data;
      console.log('🔍 Updated appointment status:', updatedAppointment.status);
      
      if (updatedAppointment.status === 'cancelled') {
        console.log('✅ Appointment successfully cancelled via API!');
      } else {
        console.log('❌ Appointment status was not updated to cancelled');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
  }
}

testCancelAppointmentAPI(); 