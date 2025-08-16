const { executeQuery, testConnection } = require('./config/database');

async function testAppointmentCreation() {
  try {
    console.log('🔍 Testing appointment creation...');
    
    // Test database connection
    const connectionResult = await testConnection();
    if (!connectionResult) {
      console.error('❌ Database connection failed');
      return;
    }
    
    // Check if appointments table exists
    const tableCheck = await executeQuery(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'pharmalink_db1' 
      AND TABLE_NAME = 'appointments'
    `);
    
    if (!tableCheck.success || tableCheck.data.length === 0) {
      console.error('❌ Appointments table does not exist!');
      console.log('💡 Please run the create-appointments-table.sql script in phpMyAdmin');
      return;
    }
    
    console.log('✅ Appointments table exists');
    
    // Check table structure
    const structureCheck = await executeQuery(`
      DESCRIBE appointments
    `);
    
    if (structureCheck.success) {
      console.log('📋 Appointments table structure:');
      structureCheck.data.forEach(column => {
        console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }
    
    // Check if there are any users
    const usersCheck = await executeQuery('SELECT id, email FROM users LIMIT 5');
    if (usersCheck.success && usersCheck.data.length > 0) {
      console.log('✅ Users found:', usersCheck.data.length);
      console.log('Sample users:', usersCheck.data.map(u => ({ id: u.id, email: u.email })));
    } else {
      console.error('❌ No users found in database');
    }
    
    // Check if there are any facilities
    const facilitiesCheck = await executeQuery('SELECT id, name, facility_type FROM healthcare_facilities LIMIT 5');
    if (facilitiesCheck.success && facilitiesCheck.data.length > 0) {
      console.log('✅ Facilities found:', facilitiesCheck.data.length);
      console.log('Sample facilities:', facilitiesCheck.data.map(f => ({ id: f.id, name: f.name, type: f.facility_type })));
    } else {
      console.error('❌ No facilities found in database');
    }
    
    // Test inserting a sample appointment
    const testAppointment = {
      user_id: 1,
      facility_id: 4,
      appointment_date: '2025-01-20',
      appointment_time: '09:00:00',
      appointment_type: 'consultation',
      reason: 'Test appointment creation',
      symptoms: JSON.stringify(['test symptom']),
      preferred_doctor: null,
      notes: 'Test notes'
    };
    
    console.log('🧪 Testing appointment insertion...');
    const insertResult = await executeQuery(`
      INSERT INTO appointments (
        user_id, facility_id, appointment_date, appointment_time, 
        appointment_type, reason, symptoms, preferred_doctor, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      testAppointment.user_id,
      testAppointment.facility_id,
      testAppointment.appointment_date,
      testAppointment.appointment_time,
      testAppointment.appointment_type,
      testAppointment.reason,
      testAppointment.symptoms,
      testAppointment.preferred_doctor,
      testAppointment.notes
    ]);
    
    if (insertResult.success) {
      console.log('✅ Test appointment created successfully!');
      console.log('Insert ID:', insertResult.data.insertId);
      
      // Clean up - delete the test appointment
      await executeQuery('DELETE FROM appointments WHERE id = ?', [insertResult.data.insertId]);
      console.log('🧹 Test appointment cleaned up');
    } else {
      console.error('❌ Failed to create test appointment:', insertResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  }
}

testAppointmentCreation(); 