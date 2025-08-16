const { executeQuery } = require('./config/database');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    console.log('Creating test user for appointment booking...');
    
    // Check if test user already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      ['testpatient@example.com']
    );
    
    if (existingUser.success && existingUser.data && existingUser.data.length > 0) {
      console.log('✅ Test user already exists');
      return;
    }
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const insertResult = await executeQuery(
      `INSERT INTO users (
        email, password_hash, first_name, last_name, phone, user_type, 
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'testpatient@example.com',
        hashedPassword,
        'Test',
        'Patient',
        '+233201234567',
        'patient',
        true
      ]
    );
    
    if (insertResult.success) {
      console.log('✅ Test user created successfully!');
      console.log('Email: testpatient@example.com');
      console.log('Password: password123');
    } else {
      console.log('❌ Failed to create test user');
    }
    
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser(); 