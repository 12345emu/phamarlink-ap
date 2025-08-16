const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function checkPharmacyMedicines() {
  let connection;
  
  try {
    console.log('🔍 Checking pharmacy_medicines table...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Check if pharmacy_medicines table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "pharmacy_medicines"');
    console.log('Pharmacy_medicines table exists:', tables.length > 0);
    
    if (tables.length === 0) {
      console.log('❌ Pharmacy_medicines table does not exist!');
      return;
    }
    
    // Check table structure
    const [columns] = await connection.execute('DESCRIBE pharmacy_medicines');
    console.log('\n📋 Pharmacy_medicines table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check existing data
    const [data] = await connection.execute('SELECT * FROM pharmacy_medicines LIMIT 10');
    console.log('\n📋 Existing pharmacy_medicines data:');
    data.forEach(row => {
      console.log(`  - ID: ${row.id}, Pharmacy: ${row.pharmacy_id}, Medicine: ${row.medicine_id}, Price: ${row.price}`);
    });
    
    // Check for medicines that exist in pharmacy_medicines
    const [pharmacyMedicines] = await connection.execute(`
      SELECT pm.id, pm.pharmacy_id, pm.medicine_id, pm.price, m.name as medicine_name, hf.name as pharmacy_name
      FROM pharmacy_medicines pm
      JOIN medicines m ON pm.medicine_id = m.id
      JOIN healthcare_facilities hf ON pm.pharmacy_id = hf.id
      LIMIT 10
    `);
    
    console.log('\n📋 Pharmacy medicines with details:');
    pharmacyMedicines.forEach(row => {
      console.log(`  - ID: ${row.id}, Pharmacy: ${row.pharmacy_name} (${row.pharmacy_id}), Medicine: ${row.medicine_name} (${row.medicine_id}), Price: ${row.price}`);
    });
    
    console.log('\n✅ Pharmacy medicines check completed!');
    
  } catch (error) {
    console.error('❌ Error checking pharmacy_medicines:', error.message);
    console.error('Error details:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

checkPharmacyMedicines(); 