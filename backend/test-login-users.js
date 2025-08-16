const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function testUsers() {
  let connection;
  
  try {
    console.log('🔍 Checking users in database...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    const [users] = await connection.execute('SELECT id, email, first_name, last_name FROM users LIMIT 10');
    
    console.log('\n📋 Users in database:');
    users.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name} ${user.last_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

testUsers(); 