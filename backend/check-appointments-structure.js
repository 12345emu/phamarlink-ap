const mysql = require('mysql2/promise');

async function checkAppointmentsStructure() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'pharmalink_db1'
    });

    console.log('🔍 Checking appointments table structure...');
    
    // Get table structure
    const [columns] = await connection.execute('DESCRIBE appointments');
    console.log('📋 Appointments table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    // Check a sample appointment to see what data is actually there
    const [sample] = await connection.execute('SELECT * FROM appointments LIMIT 1');
    if (sample.length > 0) {
      console.log('📋 Sample appointment data:');
      console.log(JSON.stringify(sample[0], null, 2));
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error checking appointments structure:', error);
  }
}

checkAppointmentsStructure(); 