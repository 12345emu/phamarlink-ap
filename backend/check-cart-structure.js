const { executeQuery } = require('./config/database');

async function checkCartStructure() {
  console.log('🔍 Checking cart and related table structures...');
  
  try {
    // Check if pharmacy_medicines table exists
    const tablesResult = await executeQuery("SHOW TABLES LIKE 'pharmacy_medicines'");
    console.log('📋 Pharmacy medicines table exists:', tablesResult.success && tablesResult.data.length > 0);
    
    if (tablesResult.success && tablesResult.data.length > 0) {
      const pharmacyMedicinesStructure = await executeQuery('DESCRIBE pharmacy_medicines');
      console.log('📋 Pharmacy medicines table structure:', pharmacyMedicinesStructure.data);
    }
    
    // Check medicines table
    const medicinesStructure = await executeQuery('DESCRIBE medicines');
    console.log('\n📋 Medicines table structure:', medicinesStructure.data);
    
    // Check cart_items table
    const cartStructure = await executeQuery('DESCRIBE cart_items');
    console.log('\n📋 Cart items table structure:', cartStructure.data);
    
    // Check if there are any medicines in the database
    const medicinesCount = await executeQuery('SELECT COUNT(*) as count FROM medicines');
    console.log('\n📊 Total medicines in database:', medicinesCount.data[0].count);
    
    // Check if there are any pharmacy_medicines entries
    if (tablesResult.success && tablesResult.data.length > 0) {
      const pharmacyMedicinesCount = await executeQuery('SELECT COUNT(*) as count FROM pharmacy_medicines');
      console.log('📊 Total pharmacy_medicines entries:', pharmacyMedicinesCount.data[0].count);
    }
    
    // Check sample medicines data
    const sampleMedicines = await executeQuery('SELECT id, name, facility_id FROM medicines LIMIT 5');
    console.log('\n📋 Sample medicines:', sampleMedicines.data);
    
    // Check sample facilities
    const sampleFacilities = await executeQuery('SELECT id, name, facility_type FROM healthcare_facilities WHERE facility_type = "pharmacy" LIMIT 3');
    console.log('\n📋 Sample pharmacies:', sampleFacilities.data);
    
  } catch (error) {
    console.error('❌ Error checking structure:', error.message);
  }
}

checkCartStructure();



