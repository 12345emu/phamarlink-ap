const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
});

async function createTestUser() {
  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Database connected successfully to pharmalink_db1');

    // Test user credentials
    const testUser = {
      email: 'test@pharmalink.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      userType: 'patient',
      phone: '+233 24 123 4567'
    };

    // Check if user already exists
    const [existingUsers] = await connection.promise().query(
      'SELECT id FROM users WHERE email = ?',
      [testUser.email]
    );

    if (existingUsers.length > 0) {
      console.log('⚠️  Test user already exists, updating password...');
      
      // Hash the new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(testUser.password, saltRounds);
      
      // Update existing user's password
      await connection.promise().query(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        [passwordHash, testUser.email]
      );
      
      console.log('✅ Test user password updated successfully');
    } else {
      console.log('📝 Creating new test user...');
      
      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(testUser.password, saltRounds);
      
      // Insert new user
      const [result] = await connection.promise().query(
        `INSERT INTO users (email, password_hash, user_type, first_name, last_name, phone, is_active, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
        [testUser.email, passwordHash, testUser.userType, testUser.firstName, testUser.lastName, testUser.phone]
      );
      
      const userId = result.insertId;
      
      // Create patient profile
      await connection.promise().query(
        'INSERT INTO patient_profiles (user_id) VALUES (?)',
        [userId]
      );
      
      console.log('✅ Test user created successfully with ID:', userId);
    }

    console.log('\n🎯 Test User Credentials:');
    console.log('Email:', testUser.email);
    console.log('Password:', testUser.password);
    console.log('User Type:', testUser.userType);
    
    console.log('\n📱 You can now test login with these credentials in your mobile app!');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    connection.end();
  }
}

createTestUser(); 