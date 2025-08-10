const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
});

async function quickCheck() {
  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Database connected');
    
    // Check medicines table
    const [medicines] = await connection.promise().query('SELECT COUNT(*) as count FROM medicines');
    console.log('📊 Medicines count:', medicines[0].count);
    
    // Check pharmacy_medicines table
    const [pharmacyMedicines] = await connection.promise().query('SELECT COUNT(*) as count FROM pharmacy_medicines');
    console.log('📊 Pharmacy medicines count:', pharmacyMedicines[0].count);
    
    // Check healthcare_professionals table
    const [professionals] = await connection.promise().query('SELECT COUNT(*) as count FROM healthcare_professionals');
    console.log('📊 Professionals count:', professionals[0].count);
    
    // Check healthcare_facilities table
    const [facilities] = await connection.promise().query('SELECT COUNT(*) as count FROM healthcare_facilities');
    console.log('📊 Facilities count:', facilities[0].count);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.end();
  }
}

quickCheck(); 