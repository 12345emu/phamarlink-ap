const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function checkUserRole() {
  let connection;
  
  try {
    console.log('🔍 Checking user role...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Check the test user's role
    const [users] = await connection.execute('SELECT id, email, user_type, first_name, last_name FROM users WHERE email = ?', ['test@pharmalink.com']);
    
    console.log('\n📋 Test user details:');
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Type: ${user.user_type}, Name: ${user.first_name} ${user.last_name}`);
    });
    
    // Check all users and their types
    const [allUsers] = await connection.execute('SELECT id, email, user_type FROM users');
    
    console.log('\n📋 All users and their types:');
    allUsers.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Type: ${user.user_type}`);
    });
    
    console.log('\n✅ User role check completed!');
    
  } catch (error) {
    console.error('❌ Error checking user role:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

checkUserRole(); 