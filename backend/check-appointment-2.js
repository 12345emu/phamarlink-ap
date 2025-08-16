const mysql = require('mysql2/promise');

async function checkAppointment2() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmalink_db1'
  });

  try {
    const [appointments] = await connection.execute(`
      SELECT 
        id, 
        user_id,
        status, 
        appointment_date, 
        appointment_time,
        TIMESTAMPDIFF(HOUR, NOW(), CONCAT(appointment_date, ' ', appointment_time)) as hours_until
      FROM appointments 
      WHERE id = 2
    `);
    
    console.log('📋 Appointment 2 details:', appointments[0]);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkAppointment2(); 