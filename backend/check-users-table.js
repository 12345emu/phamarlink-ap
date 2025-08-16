const mysql = require('mysql2/promise');

async function checkUsersTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'pharmalink_db1'
    });

    console.log('🔍 Checking users table structure...');
    
    // Get table structure
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('📋 Users table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    // Check if patient_profiles table exists
    const [profiles] = await connection.execute('DESCRIBE patient_profiles');
    console.log('📋 Patient profiles table columns:');
    profiles.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error checking users table:', error);
  }
}

checkUsersTable(); 