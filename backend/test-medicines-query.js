const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
});

async function testMedicinesQuery() {
  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Database connected successfully to pharmalink_db1');
    
    // Test the exact query from the API
    const query = `
      SELECT 
        m.id, m.name, m.generic_name, m.category, m.prescription_required,
        m.dosage_form, m.strength, m.description,
        MIN(pm.price) as min_price,
        MAX(pm.price) as max_price,
        COUNT(DISTINCT pm.pharmacy_id) as available_pharmacies,
        AVG(pm.stock_quantity) as avg_stock,
        GROUP_CONCAT(DISTINCT f.name) as pharmacy_names
      FROM medicines m
      INNER JOIN pharmacy_medicines pm ON m.id = pm.medicine_id
      INNER JOIN healthcare_facilities f ON pm.pharmacy_id = f.id
      WHERE m.is_active = true 
      AND pm.is_available = true 
      AND pm.stock_quantity > 0
      AND f.is_active = true
      GROUP BY m.id
      ORDER BY available_pharmacies DESC, avg_stock DESC
      LIMIT 5
    `;
    
    console.log('🔍 Executing query...');
    const [medicines] = await connection.promise().query(query);
    
    console.log('🔍 Query result type:', typeof medicines);
    console.log('🔍 Is array:', Array.isArray(medicines));
    console.log('🔍 Result length:', medicines.length);
    console.log('🔍 Raw result:', JSON.stringify(medicines, null, 2));
    
    if (medicines.length > 0) {
      console.log('\n📊 Sample medicine:');
      console.log(JSON.stringify(medicines[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing medicines query:', error);
  } finally {
    connection.end();
  }
}

testMedicinesQuery(); 