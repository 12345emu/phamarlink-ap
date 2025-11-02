const { executeQuery } = require('./config/database');

async function setupPharmacyMedicines() {
  console.log('🔧 Setting up pharmacy medicines data...');
  
  try {
    // Get all medicines and pharmacies
    const medicinesResult = await executeQuery('SELECT id, name, facility_id FROM medicines WHERE is_active = TRUE');
    const pharmaciesResult = await executeQuery('SELECT id, name FROM healthcare_facilities WHERE facility_type = "pharmacy" AND is_active = TRUE');
    
    console.log(`📊 Found ${medicinesResult.data.length} medicines and ${pharmaciesResult.data.length} pharmacies`);
    
    if (medicinesResult.data.length === 0 || pharmaciesResult.data.length === 0) {
      console.log('❌ No medicines or pharmacies found. Cannot setup pharmacy medicines.');
      return;
    }
    
    // Create pharmacy_medicines entries
    let insertedCount = 0;
    
    for (const medicine of medicinesResult.data) {
      // For each medicine, add it to multiple pharmacies with different prices
      for (const pharmacy of pharmaciesResult.data) {
        // Skip if medicine already belongs to this pharmacy
        if (medicine.facility_id === pharmacy.id) {
          continue;
        }
        
        // Generate random price between 20-100
        const basePrice = Math.floor(Math.random() * 80) + 20;
        const discountPrice = Math.random() > 0.7 ? basePrice * 0.9 : null; // 30% chance of discount
        
        const insertQuery = `
          INSERT INTO pharmacy_medicines (
            facility_id, pharmacy_id, medicine_id, stock_quantity, 
            price, discount_price, is_available
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await executeQuery(insertQuery, [
          pharmacy.id,
          pharmacy.id,
          medicine.id,
          Math.floor(Math.random() * 50) + 10, // Random stock 10-60
          basePrice,
          discountPrice,
          true
        ]);
        
        if (result.success) {
          insertedCount++;
        }
      }
    }
    
    console.log(`✅ Created ${insertedCount} pharmacy_medicines entries`);
    
    // Verify the data
    const verifyResult = await executeQuery(`
      SELECT 
        pm.id,
        m.name as medicine_name,
        hf.name as pharmacy_name,
        pm.price,
        pm.discount_price,
        pm.stock_quantity
      FROM pharmacy_medicines pm
      JOIN medicines m ON pm.medicine_id = m.id
      JOIN healthcare_facilities hf ON pm.pharmacy_id = hf.id
      LIMIT 10
    `);
    
    console.log('\n📋 Sample pharmacy medicines:');
    verifyResult.data.forEach((item, index) => {
      console.log(`${index + 1}. ${item.medicine_name} at ${item.pharmacy_name} - $${item.price} (Stock: ${item.stock_quantity})`);
    });
    
    console.log('\n🎉 Pharmacy medicines setup completed!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

setupPharmacyMedicines();












