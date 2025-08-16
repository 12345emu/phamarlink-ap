const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function checkMedicines() {
  let connection;
  
  try {
    console.log('🔍 Checking medicines in database...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    const [medicines] = await connection.execute('SELECT id, name, min_price FROM medicines LIMIT 10');
    
    console.log('\n📋 Medicines in database:');
    medicines.forEach(medicine => {
      console.log(`  - ID: ${medicine.id}, Name: ${medicine.name}, Price: ${medicine.min_price}`);
    });
    
    if (medicines.length === 0) {
      console.log('\n⚠️ No medicines found! This is why cart is failing.');
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

checkMedicines(); 