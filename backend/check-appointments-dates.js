const mysql = require('mysql2/promise');

async function checkAppointmentDates() {
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
        DATEDIFF(appointment_date, CURDATE()) as days_until,
        TIMESTAMPDIFF(HOUR, NOW(), CONCAT(appointment_date, ' ', appointment_time)) as hours_until
      FROM appointments 
      WHERE status != 'cancelled' 
      ORDER BY appointment_date 
      LIMIT 10
    `);
    
    console.log('📋 Appointments with time until:');
    appointments.forEach(apt => {
      console.log(`  ID: ${apt.id}, Status: ${apt.status}, Date: ${apt.appointment_date}, Time: ${apt.appointment_time}, Days until: ${apt.days_until}, Hours until: ${apt.hours_until}`);
    });
    
    // Find appointments that can be cancelled (more than 24 hours away)
    const cancellable = appointments.filter(apt => apt.hours_until > 24);
    console.log(`\n✅ ${cancellable.length} appointments can be cancelled (more than 24 hours away):`);
    cancellable.forEach(apt => {
      console.log(`  ID: ${apt.id}, Hours until: ${apt.hours_until}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkAppointmentDates(); 