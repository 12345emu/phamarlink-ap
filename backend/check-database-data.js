const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
});

async function checkDatabaseData() {
  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Database connected successfully to pharmalink_db1');
    
    // Check medicines table
    console.log('\n📋 Checking medicines table...');
    const [medicinesTables] = await connection.promise().query('SHOW TABLES LIKE "medicines"');
    if (medicinesTables.length > 0) {
      const [medicinesCount] = await connection.promise().query('SELECT COUNT(*) as count FROM medicines');
      console.log(`✅ medicines table exists with ${medicinesCount[0].count} records`);
      
      if (medicinesCount[0].count > 0) {
        const [medicines] = await connection.promise().query('SELECT id, name, category, prescription_required FROM medicines LIMIT 5');
        console.log('📊 Sample medicines:');
        medicines.forEach(medicine => {
          console.log(`- ${medicine.name} (${medicine.category}) - Prescription: ${medicine.prescription_required ? 'Yes' : 'No'}`);
        });
      }
    } else {
      console.log('❌ medicines table does not exist');
    }
    
    // Check healthcare_professionals table
    console.log('\n👨‍⚕️ Checking healthcare_professionals table...');
    const [professionalsTables] = await connection.promise().query('SHOW TABLES LIKE "healthcare_professionals"');
    if (professionalsTables.length > 0) {
      const [professionalsCount] = await connection.promise().query('SELECT COUNT(*) as count FROM healthcare_professionals');
      console.log(`✅ healthcare_professionals table exists with ${professionalsCount[0].count} records`);
      
      if (professionalsCount[0].count > 0) {
        const [professionals] = await connection.promise().query('SELECT id, first_name, last_name, specialty, rating FROM healthcare_professionals LIMIT 5');
        console.log('📊 Sample professionals:');
        professionals.forEach(professional => {
          console.log(`- Dr. ${professional.first_name} ${professional.last_name} (${professional.specialty}) - Rating: ${professional.rating}`);
        });
      }
    } else {
      console.log('❌ healthcare_professionals table does not exist');
    }
    
    // Check pharmacy_medicines table
    console.log('\n💊 Checking pharmacy_medicines table...');
    const [pharmacyMedicinesTables] = await connection.promise().query('SHOW TABLES LIKE "pharmacy_medicines"');
    if (pharmacyMedicinesTables.length > 0) {
      const [pharmacyMedicinesCount] = await connection.promise().query('SELECT COUNT(*) as count FROM pharmacy_medicines');
      console.log(`✅ pharmacy_medicines table exists with ${pharmacyMedicinesCount[0].count} records`);
      
      if (pharmacyMedicinesCount[0].count > 0) {
        const [pharmacyMedicines] = await connection.promise().query(`
          SELECT pm.id, m.name as medicine_name, f.name as pharmacy_name, pm.price, pm.stock_quantity 
          FROM pharmacy_medicines pm 
          JOIN medicines m ON pm.medicine_id = m.id 
          JOIN healthcare_facilities f ON pm.pharmacy_id = f.id 
          LIMIT 5
        `);
        console.log('📊 Sample pharmacy medicines:');
        pharmacyMedicines.forEach(item => {
          console.log(`- ${item.medicine_name} at ${item.pharmacy_name} - Price: GHS ${item.price}, Stock: ${item.stock_quantity}`);
        });
      }
    } else {
      console.log('❌ pharmacy_medicines table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error checking database data:', error);
  } finally {
    connection.end();
  }
}

checkDatabaseData(); 