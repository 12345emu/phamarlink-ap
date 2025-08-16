const mysql = require('mysql2/promise');

async function checkOperatingHours() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmalink_db1'
  });

  try {
    console.log('🔍 Checking operating_hours data...');
    
    const [facilities] = await connection.execute(`
      SELECT id, name, operating_hours, LENGTH(operating_hours) as hours_length
      FROM healthcare_facilities 
      WHERE is_active = true 
      LIMIT 5
    `);
    
    console.log('📋 Facilities with operating hours:');
    facilities.forEach(facility => {
      console.log(`  ID: ${facility.id}, Name: ${facility.name}`);
      console.log(`  Operating Hours Length: ${facility.hours_length}`);
      console.log(`  Operating Hours: ${facility.operating_hours}`);
      console.log('  ---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkOperatingHours(); 