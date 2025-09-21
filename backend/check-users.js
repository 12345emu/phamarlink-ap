const { executeQuery } = require('./config/database');

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...');
    
    const users = await executeQuery(`
      SELECT 
        id, email, user_type, first_name, last_name, is_active
      FROM users 
      WHERE user_type IN ('patient', 'doctor', 'pharmacist')
      ORDER BY created_at DESC
    `);
    
    console.log('📊 Users found:', users);
    console.log('📊 Total users:', users.data?.length || 0);
    
    if (users.data && users.data.length > 0) {
      console.log('\n👥 Available users:');
      users.data.forEach((user, index) => {
        console.log(`${index + 1}. ${user.first_name} ${user.last_name} (${user.email}) - ${user.user_type} - Active: ${user.is_active}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  }
}

checkUsers();

