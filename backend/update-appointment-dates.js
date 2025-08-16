const mysql = require('mysql2/promise');

async function updateAppointmentDates() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmalink_db1'
  });

  try {
    console.log('🔍 Updating appointment dates to be in the future...');
    
    // Update appointments to be 2-7 days in the future
    const updateResult = await connection.execute(`
      UPDATE appointments 
      SET 
        appointment_date = DATE_ADD(CURDATE(), INTERVAL (id + 2) DAY),
        appointment_time = CASE 
          WHEN id = 1 THEN '09:00:00'
          WHEN id = 2 THEN '14:30:00'
          WHEN id = 3 THEN '10:00:00'
          WHEN id = 4 THEN '11:00:00'
          WHEN id = 6 THEN '08:30:00'
          ELSE '10:00:00'
        END
      WHERE id IN (1, 2, 3, 4, 6)
    `);
    
    console.log('✅ Updated appointments:', updateResult[0].affectedRows, 'rows affected');
    
    // Verify the updates
    const [appointments] = await connection.execute(`
      SELECT 
        id, 
        status, 
        appointment_date, 
        appointment_time,
        TIMESTAMPDIFF(HOUR, NOW(), CONCAT(appointment_date, ' ', appointment_time)) as hours_until
      FROM appointments 
      WHERE id IN (1, 2, 3, 4, 6)
      ORDER BY appointment_date
    `);
    
    console.log('📋 Updated appointments:');
    appointments.forEach(apt => {
      console.log(`  ID: ${apt.id}, Status: ${apt.status}, Date: ${apt.appointment_date}, Time: ${apt.appointment_time}, Hours until: ${apt.hours_until}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

updateAppointmentDates(); 