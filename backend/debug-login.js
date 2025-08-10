const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
});

async function debugLogin() {
  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Database connected successfully to pharmalink_db1');
    
    const testEmail = 'test@pharmalink.com';
    const testPassword = 'password123';
    
    console.log('\n🧪 Debugging login for:', testEmail);
    console.log('🔐 Password:', testPassword);
    
    // Step 1: Find user by email
    const [users] = await connection.promise().query(
      'SELECT id, email, password_hash, user_type, first_name, last_name, is_active FROM users WHERE email = ?',
      [testEmail]
    );
    
    if (users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[0];
    console.log('\n📝 User found:');
    console.log('- ID:', user.id);
    console.log('- Email:', user.email);
    console.log('- User Type:', user.user_type);
    console.log('- First Name:', user.first_name);
    console.log('- Last Name:', user.last_name);
    console.log('- Is Active:', user.is_active);
    console.log('- Password Hash:', user.password_hash);
    
    // Step 2: Check if user is active
    if (!user.is_active) {
      console.log('❌ User account is deactivated');
      return;
    }
    
    // Step 3: Verify password
    console.log('\n🔑 Verifying password...');
    const isPasswordValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log('✅ Password valid:', isPasswordValid);
    
    if (isPasswordValid) {
      console.log('🎉 Login would succeed!');
    } else {
      console.log('❌ Login would fail - password mismatch');
      
      // Let's try to understand why
      console.log('\n🔍 Debugging password comparison...');
      
      // Test with exact hash from database
      const storedHash = user.password_hash;
      const test1 = await bcrypt.compare(testPassword, storedHash);
      console.log('Test 1 - Direct comparison:', test1);
      
      // Generate new hash with same password
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log('New hash generated:', newHash);
      
      // Test new hash
      const test2 = await bcrypt.compare(testPassword, newHash);
      console.log('Test 2 - New hash comparison:', test2);
      
      // Test stored hash with new hash
      const test3 = await bcrypt.compare(testPassword, storedHash);
      console.log('Test 3 - Stored hash comparison:', test3);
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    connection.end();
  }
}

debugLogin(); 