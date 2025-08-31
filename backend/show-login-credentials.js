const { executeQuery } = require('./config/database');

async function showLoginCredentials() {
  try {
    console.log('🔍 Fetching user credentials from database...');
    
    // Get all users with their basic info
    const usersQuery = 'SELECT id, email, first_name, last_name, user_type FROM users WHERE is_active = TRUE';
    const usersResult = await executeQuery(usersQuery);
    
    if (!usersResult.success) {
      console.error('❌ Failed to fetch users');
      return;
    }
    
    console.log('\n📋 Available Login Credentials:');
    console.log('================================');
    
    usersResult.data.forEach((user, index) => {
      console.log(`\n${index + 1}. User ID: ${user.id}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.user_type}`);
      console.log(`   Password: TestPassword123! (default)`);
    });
    
    console.log('\n🔑 Default Password for all users: TestPassword123!');
    console.log('\n💡 You can use any of these credentials to test the token expiration feature.');
    console.log('   The token expiration feature will work with any authenticated user.');
    
    // Show specific test user for token expiration
    console.log('\n🧪 Special Test User for Token Expiration:');
    console.log('   Email: test-token@example.com');
    console.log('   Password: TestPassword123!');
    console.log('   (This user was created by the token expiration test script)');
    
  } catch (error) {
    console.error('❌ Error fetching user credentials:', error);
  }
}

showLoginCredentials();
