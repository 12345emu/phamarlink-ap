const { executeQuery } = require('./config/database');

async function checkAppointmentsTable() {
  try {
    console.log('🔍 Checking if appointments table exists...');
    
    // Check if appointments table exists
    const tableCheck = await executeQuery(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'pharmalink_db1' 
      AND TABLE_NAME = 'appointments'
    `);
    
    if (!tableCheck.success) {
      console.error('❌ Database query failed:', tableCheck.error);
      return;
    }
    
    if (tableCheck.data.length === 0) {
      console.error('❌ Appointments table does NOT exist!');
      console.log('💡 You need to create the appointments table.');
      console.log('💡 Please run the create-appointments-table.sql script in phpMyAdmin');
      return;
    }
    
    console.log('✅ Appointments table exists!');
    
    // Check table structure
    const structureCheck = await executeQuery('DESCRIBE appointments');
    
    if (structureCheck.success) {
      console.log('📋 Appointments table structure:');
      structureCheck.data.forEach(column => {
        console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } else {
      console.error('❌ Failed to get table structure:', structureCheck.error);
    }
    
    // Check if table has any data
    const dataCheck = await executeQuery('SELECT COUNT(*) as count FROM appointments');
    if (dataCheck.success) {
      console.log(`📊 Appointments table has ${dataCheck.data[0].count} records`);
    }
    
  } catch (error) {
    console.error('❌ Error checking appointments table:', error);
  }
}

checkAppointmentsTable(); 