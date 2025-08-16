const mysql = require('mysql2/promise');

async function checkUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmalink_db1'
  });

  try {
    const [users] = await connection.execute(
      'SELECT id, email, user_type FROM users LIMIT 10'
    );
    
    console.log('📋 Users in database:', users);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkUsers(); 