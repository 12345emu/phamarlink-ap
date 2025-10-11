const { executeQuery } = require('./config/database');

async function debugPharmacyQuery() {
  console.log('🔍 Debugging pharmacy medicines query...');
  
  const facilityId = 5; // CityMed Pharmacy
  
  try {
    // Test the exact query from the API
    const medicinesQuery = `
      SELECT 
        m.id, m.name, m.generic_name, m.category, m.prescription_required,
        m.dosage_form, m.strength, m.description, m.manufacturer,
        COALESCE(pm.stock_quantity, 50) as stock_quantity,
        COALESCE(pm.price, 45.00) as price,
        pm.discount_price,
        COALESCE(pm.is_available, TRUE) as is_available,
        pm.id as pharmacy_medicine_id
      FROM medicines m
      LEFT JOIN pharmacy_medicines pm ON m.id = pm.medicine_id AND pm.pharmacy_id = ?
      WHERE m.is_active = TRUE
      ORDER BY m.category, m.name
    `;
    
    console.log('📋 Executing query with facilityId:', facilityId);
    const result = await executeQuery(medicinesQuery, [facilityId]);
    
    console.log('📋 Query result:', {
      success: result.success,
      dataLength: result.data ? result.data.length : 0,
      error: result.error
    });
    
    if (result.success && result.data.length > 0) {
      console.log('📋 Sample data:');
      result.data.slice(0, 3).forEach((medicine, index) => {
        console.log(`${index + 1}. ${medicine.name} (${medicine.category}) - pharmacy_medicine_id: ${medicine.pharmacy_medicine_id}`);
      });
      
      // Test the grouping logic
      console.log('\n📋 Testing grouping logic...');
      const medicinesByCategory = {};
      result.data.forEach(medicine => {
        if (!medicinesByCategory[medicine.category]) {
          medicinesByCategory[medicine.category] = [];
        }
        medicinesByCategory[medicine.category].push({
          id: medicine.id,
          name: medicine.name,
          generic_name: medicine.generic_name,
          category: medicine.category,
          prescription_required: medicine.prescription_required === 1,
          dosage_form: medicine.dosage_form,
          strength: medicine.strength,
          description: medicine.description,
          manufacturer: medicine.manufacturer,
          stock_quantity: medicine.stock_quantity,
          price: parseFloat(medicine.price),
          discount_price: medicine.discount_price ? parseFloat(medicine.discount_price) : null,
          is_available: medicine.is_available === 1,
          pharmacy_medicine_id: medicine.pharmacy_medicine_id
        });
      });
      
      console.log('📋 Grouped categories:', Object.keys(medicinesByCategory));
      console.log('📋 Total medicines:', result.data.length);
      
    } else {
      console.log('❌ No data returned from query');
      
      // Let's check what medicines exist
      console.log('\n📋 Checking what medicines exist...');
      const allMedicines = await executeQuery('SELECT id, name, category, is_active FROM medicines LIMIT 5');
      console.log('All medicines:', allMedicines.data);
      
      // Check what pharmacy_medicines exist for this pharmacy
      console.log('\n📋 Checking pharmacy_medicines for pharmacy 5...');
      const pharmacyMedicines = await executeQuery('SELECT id, medicine_id, pharmacy_id FROM pharmacy_medicines WHERE pharmacy_id = 5 LIMIT 5');
      console.log('Pharmacy medicines:', pharmacyMedicines.data);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugPharmacyQuery();







