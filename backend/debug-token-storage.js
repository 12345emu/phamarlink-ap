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

async function debugTokenStorage() {
  console.log('🔍 Debugging Token Storage and Retrieval');
  console.log('=====================================\n');

  // Step 1: Check if test user exists
  console.log('1️⃣ Checking if test user exists...');
  const userResult = await executeQuery(
    'SELECT id, email, password_hash, user_type FROM users WHERE email = ?',
    [TEST_EMAIL]
  );

  if (!userResult.success || userResult.data.length === 0) {
    console.log('❌ Test user not found. Creating...');
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    const insertResult = await executeQuery(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, phone, user_type, 
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        TEST_EMAIL,
        hashedPassword,
        'Test',
        'Patient',
        '+233201234567',
        'patient',
        true
      ]
    );
    
    if (insertResult.success) {
      console.log('✅ Test user created successfully');
    } else {
      console.log('❌ Failed to create test user:', insertResult.error);
      return;
    }
  } else {
    console.log('✅ Test user found:', {
      id: userResult.data[0].id,
      email: userResult.data[0].email,
      user_type: userResult.data[0].user_type
    });
  }

  // Step 2: Test login API
  console.log('\n2️⃣ Testing login API...');
  try {
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    console.log('✅ Login successful!');
    console.log('📋 Login response structure:', {
      success: loginResponse.data.success,
      hasData: !!loginResponse.data.data,
      hasUser: !!loginResponse.data.data?.user,
      hasToken: !!loginResponse.data.data?.token,
      hasRefreshToken: !!loginResponse.data.data?.refreshToken,
      userFields: loginResponse.data.data?.user ? Object.keys(loginResponse.data.data.user) : [],
      tokenLength: loginResponse.data.data?.token?.length || 0
    });

    const authData = loginResponse.data.data;
    console.log('🔑 Token preview:', authData.token ? `${authData.token.substring(0, 20)}...` : 'No token');
    console.log('👤 User ID:', authData.user?.id);
    console.log('📧 User Email:', authData.user?.email);

    // Step 3: Test appointment creation with the obtained token
    console.log('\n3️⃣ Testing appointment creation with obtained token...');
    const appointmentData = {
      facility_id: 12,
      appointment_date: '2025-01-20',
      appointment_time: '09:00',
      appointment_type: 'consultation',
      reason: 'Test appointment with real token',
      symptoms: ['test symptom'],
      notes: 'Test notes'
    };

    const createResponse = await axios.post(`${BASE_URL}/appointments`, appointmentData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.token}`
      }
    });

    console.log('✅ Appointment creation successful!');
    console.log('📋 Create response:', JSON.stringify(createResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error during login or appointment creation:', error.response?.data || error.message);
    console.error('❌ Status:', error.response?.status);
    
    if (error.response?.status === 401) {
      console.log('🔍 401 Error Details:');
      console.log('   - Response data:', JSON.stringify(error.response.data, null, 2));
      console.log('   - Response headers:', JSON.stringify(error.response.headers, null, 2));
    }
  }

  // Step 4: Test token validation
  console.log('\n4️⃣ Testing token validation...');
  try {
    const userResult = await executeQuery(
      'SELECT id, email, password_hash, user_type FROM users WHERE email = ?',
      [TEST_EMAIL]
    );

    if (userResult.success && userResult.data.length > 0) {
      const user = userResult.data[0];
      console.log('✅ User exists in database:', {
        id: user.id,
        email: user.email,
        user_type: user.user_type
      });
    }
  } catch (error) {
    console.error('❌ Error checking user in database:', error);
  }

  console.log('\n🏁 Debug complete!');
}

// Run the debug
debugTokenStorage().catch(console.error); 