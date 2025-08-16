const mysql = require('mysql2/promise');

async function checkAppointments() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'pharmalink_db1'
    });

    console.log('🔍 Checking appointments in database...');
    
    const [rows] = await connection.execute('SELECT id, user_id, facility_id, appointment_date, appointment_time, status FROM appointments LIMIT 10');
    
    console.log('📋 Appointments found:', rows.length);
    console.log('📋 Appointment IDs:', rows.map(row => row.id));
    
    if (rows.length > 0) {
      console.log('📋 First appointment details:', rows[0]);
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error checking appointments:', error);
  }
}

checkAppointments(); 