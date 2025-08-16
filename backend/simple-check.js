const mysql = require('mysql2/promise');

async function simpleCheck() {
  try {
    console.log('🔍 Simple database check...');
    
    // Create connection
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'pharmalink_db1'
    });
    
    console.log('✅ Connected to database');
    
    // Check if appointments table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'pharmalink_db1' 
      AND TABLE_NAME = 'appointments'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Appointments table does NOT exist!');
      console.log('💡 You need to create it using the SQL script');
    } else {
      console.log('✅ Appointments table exists!');
      
      // Check structure
      const [columns] = await connection.execute('DESCRIBE appointments');
      console.log('📋 Table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type}`);
      });
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

simpleCheck(); 