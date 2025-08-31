const bcrypt = require('bcryptjs');
const { executeQuery } = require('./config/database');

async function resetUserPasswords() {
  try {
    console.log('🔍 Resetting all user passwords to default...');
    
    // Hash the default password
    const defaultPassword = 'TestPassword123!';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);
    
    console.log('🔍 Default password hash generated');
    
    // Get all active users
    const usersQuery = 'SELECT id, email, first_name, last_name FROM users WHERE is_active = TRUE';
    const usersResult = await executeQuery(usersQuery);
    
    if (!usersResult.success) {
      console.error('❌ Failed to fetch users');
      return;
    }
    
    console.log(`\n📋 Found ${usersResult.data.length} active users`);
    
    // Reset password for each user
    for (const user of usersResult.data) {
      try {
        const updateQuery = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        const updateResult = await executeQuery(updateQuery, [passwordHash, user.id]);
        
        if (updateResult.success) {
          console.log(`✅ Reset password for: ${user.email} (${user.first_name} ${user.last_name})`);
        } else {
          console.log(`❌ Failed to reset password for: ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error resetting password for ${user.email}:`, error);
      }
    }
    
    console.log('\n🎉 Password reset completed!');
    console.log('\n📋 Updated Login Credentials:');
    console.log('=============================');
    
    usersResult.data.forEach((user, index) => {
      console.log(`\n${index + 1}. Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Password: TestPassword123!`);
    });
    
    console.log('\n🔑 All users now have the password: TestPassword123!');
    console.log('💡 You can now use any of these credentials to test the token expiration feature.');
    
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
  }
}

resetUserPasswords();
