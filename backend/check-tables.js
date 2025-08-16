const mysql = require('mysql2/promise');

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'pharmalink_db1'
    });

    console.log('🔍 Checking tables...');
    
    // Check if healthcare_facilities table exists
    const [facilities] = await connection.execute('SELECT id, name, facility_type FROM healthcare_facilities LIMIT 5');
    console.log('📋 Healthcare facilities found:', facilities.length);
    console.log('📋 Facility IDs:', facilities.map(f => f.id));
    
    if (facilities.length > 0) {
      console.log('📋 First facility:', facilities[0]);
    }
    
    // Check appointments with facility_id
    const [appointments] = await connection.execute(`
      SELECT a.id, a.user_id, a.facility_id, a.appointment_date, a.status, hf.name as facility_name
      FROM appointments a
      LEFT JOIN healthcare_facilities hf ON a.facility_id = hf.id
      LIMIT 5
    `);
    
    console.log('📋 Appointments with facility info:', appointments.length);
    appointments.forEach(apt => {
      console.log(`📋 Appointment ${apt.id}: facility_id=${apt.facility_id}, facility_name=${apt.facility_name || 'NULL'}`);
    });
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  }
}

checkTables(); 