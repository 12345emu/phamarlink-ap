const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }
  
  console.log('✅ Database connected successfully to pharmalink_db1');
  
  // Check users table structure
  connection.query('DESCRIBE users', (err, results) => {
    if (err) {
      console.error('❌ Error describing users table:', err);
    } else {
      console.log('\n📋 Users table structure:');
      results.forEach(row => {
        console.log(`- ${row.Field} (${row.Type}) ${row.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${row.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
      });
    }
    
    // Check if there are any existing users
    connection.query('SELECT COUNT(*) as userCount FROM users', (err, results) => {
      if (err) {
        console.error('❌ Error counting users:', err);
      } else {
        console.log(`\n👥 Total users in database: ${results[0].userCount}`);
      }
      
      // Check sample user data
      connection.query('SELECT * FROM users LIMIT 1', (err, results) => {
        if (err) {
          console.error('❌ Error getting sample user:', err);
        } else if (results.length > 0) {
          console.log('\n📝 Sample user data:');
          console.log(JSON.stringify(results[0], null, 2));
        } else {
          console.log('\n📝 No users found in database');
        }
        
        connection.end();
      });
    });
  });
}); 