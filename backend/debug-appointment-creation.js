const axios = require('axios');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// API configuration
const BASE_URL = 'http://192.168.1.100:3000';

// Test user credentials
const TEST_EMAIL = 'testpatient@example.com';
const TEST_PASSWORD = 'password';

async function executeQuery(query, params = []) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(query, params);
    return { success: true, data: rows };
  } catch (error) {
    console.error('Database error:', error);
    return { success: false, error: error.message };
  } finally {
    await connection.end();
  }
}

async function debugAppointmentCreation() {
  console.log('🔍 Debugging Appointment Creation Process');
  console.log('========================================\n');

  // Step 1: Check if test user exists and get their ID
  console.log('1️⃣ Checking test user...');
  const userResult = await executeQuery(
    'SELECT id, email, user_type FROM users WHERE email = ?',
    [TEST_EMAIL]
  );

  if (!userResult.success || userResult.data.length === 0) {
    console.log('❌ Test user not found');
    return;
  }

  const user = userResult.data[0];
  console.log('✅ Test user found:', { id: user.id, email: user.email, user_type: user.user_type });

  // Step 2: Check if facility exists
  console.log('\n2️⃣ Checking facility...');
  const facilityResult = await executeQuery(
    'SELECT id, name, facility_type, is_active FROM healthcare_facilities WHERE id = 12',
    []
  );

  if (!facilityResult.success || facilityResult.data.length === 0) {
    console.log('❌ Facility not found');
    return;
  }

  const facility = facilityResult.data[0];
  console.log('✅ Facility found:', { id: facility.id, name: facility.name, type: facility.facility_type, active: facility.is_active });

  // Step 3: Check appointments table structure
  console.log('\n3️⃣ Checking appointments table structure...');
  const tableResult = await executeQuery(
    'DESCRIBE appointments',
    []
  );

  if (tableResult.success) {
    console.log('✅ Appointments table structure:');
    tableResult.data.forEach(column => {
      console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
    });
  } else {
    console.log('❌ Error checking table structure:', tableResult.error);
  }

  // Step 4: Test the insert query directly
  console.log('\n4️⃣ Testing insert query directly...');
  const testAppointmentData = {
    user_id: user.id,
    facility_id: 12,
    appointment_date: '2025-01-20',
    appointment_time: '09:00',
    appointment_type: 'consultation',
    reason: 'Test appointment creation',
    symptoms: JSON.stringify(['test symptom']),
    preferred_doctor: null,
    notes: 'Test notes'
  };

  const insertQuery = `
    INSERT INTO appointments (
      user_id, facility_id, appointment_date, appointment_time, appointment_type,
      reason, symptoms, preferred_doctor, notes, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
  `;

  const insertResult = await executeQuery(insertQuery, [
    testAppointmentData.user_id,
    testAppointmentData.facility_id,
    testAppointmentData.appointment_date,
    testAppointmentData.appointment_time,
    testAppointmentData.appointment_type,
    testAppointmentData.reason,
    testAppointmentData.symptoms,
    testAppointmentData.preferred_doctor,
    testAppointmentData.notes
  ]);

  if (insertResult.success) {
    console.log('✅ Direct insert successful, ID:', insertResult.data.insertId);
    
    // Clean up the test appointment
    await executeQuery('DELETE FROM appointments WHERE id = ?', [insertResult.data.insertId]);
    console.log('✅ Test appointment cleaned up');
  } else {
    console.log('❌ Direct insert failed:', insertResult.error);
  }

  // Step 5: Test login and API call
  console.log('\n5️⃣ Testing login and API call...');
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      const token = loginResponse.data.data.token;
      
      // Test appointment creation via API
      const appointmentData = {
        facility_id: 12,
        appointment_date: '2025-01-20',
        appointment_time: '09:00',
        appointment_type: 'consultation',
        reason: 'Test appointment via API',
        symptoms: ['test symptom'],
        notes: 'Test notes'
      };

      const createResponse = await axios.post(`${BASE_URL}/appointments`, appointmentData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ API appointment creation successful:', createResponse.data);
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }
  } catch (error) {
    console.error('❌ Error during API test:', error.response?.data || error.message);
    console.error('❌ Status:', error.response?.status);
  }

  console.log('\n🏁 Debug complete!');
}

// Run the debug
debugAppointmentCreation().catch(console.error); 