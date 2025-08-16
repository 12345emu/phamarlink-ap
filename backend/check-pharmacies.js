const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function checkPharmacies() {
  let connection;
  
  try {
    console.log('🔍 Checking healthcare facilities in database...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // First, let's see the table structure
    const [columns] = await connection.execute('DESCRIBE healthcare_facilities');
    console.log('\n📋 Table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    // Now check what facilities exist
    const [facilities] = await connection.execute('SELECT id, name FROM healthcare_facilities LIMIT 10');
    
    console.log('\n📋 Healthcare facilities in database:');
    facilities.forEach(facility => {
      console.log(`  - ID: ${facility.id}, Name: ${facility.name}`);
    });
    
    if (facilities.length === 0) {
      console.log('\n⚠️ No healthcare facilities found! This is why cart is failing.');
      console.log('   You need to create at least one facility in the healthcare_facilities table.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

checkPharmacies(); 