const { executeQuery } = require('./config/database');
const bcrypt = require('bcryptjs');

async function checkAndCreateUser() {
  try {
    console.log('🔍 Checking users in database...');
    
    // Check existing users
    const usersResult = await executeQuery('SELECT id, email, user_type, is_active FROM users');
    
    if (usersResult.success) {
      console.log(`✅ Found ${usersResult.data.length} users:`);
      usersResult.data.forEach(user => {
        console.log(`  - ID: ${user.id}, Email: ${user.email}, Type: ${user.user_type}, Active: ${user.is_active}`);
      });
    } else {
      console.error('❌ Failed to fetch users:', usersResult.error);
    }
    
    // Check if test patient exists
    const testUserResult = await executeQuery(
      'SELECT id, email, user_type FROM users WHERE email = ?',
      ['testpatient@example.com']
    );
    
    if (testUserResult.success && testUserResult.data.length > 0) {
      console.log('✅ Test patient user already exists');
      return;
    }
    
    // Create test patient user
    console.log('📝 Creating test patient user...');
    const hashedPassword = await bcrypt.hash('password', 10);
    
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
      console.log('✅ Test patient user created successfully!');
      console.log('Email: testpatient@example.com');
      console.log('Password: password');
    } else {
      console.log('❌ Failed to create test user:', insertResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAndCreateUser(); 