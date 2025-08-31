const { executeQuery } = require('./config/database');

async function checkPharmacySchema() {
  try {
    console.log('🔍 Checking healthcare_facilities table schema...');
    
    // Check table structure
    const structureQuery = 'DESCRIBE healthcare_facilities';
    const structureResult = await executeQuery(structureQuery);
    
    if (!structureResult.success) {
      console.error('❌ Failed to get table structure');
      return;
    }
    
    console.log('📋 healthcare_facilities table columns:');
    structureResult.data.forEach(column => {
      console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check if required columns exist
    const requiredColumns = [
      'name', 'facility_type', 'owner_name', 'email', 'phone', 'address', 'city',
      'state', 'postal_code', 'latitude', 'longitude', 'license_number',
      'registration_number', 'services', 'operating_hours', 'emergency_contact',
      'description', 'accepts_insurance', 'has_delivery', 'has_consultation',
      'images', 'is_active', 'is_verified'
    ];
    
    const existingColumns = structureResult.data.map(col => col.Field);
    
    console.log('\n🔍 Checking required columns:');
    requiredColumns.forEach(column => {
      if (existingColumns.includes(column)) {
        console.log(`  ✅ ${column}`);
      } else {
        console.log(`  ❌ ${column} - MISSING`);
      }
    });
    
    // Check if any required columns are missing
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\n❌ Missing columns detected!');
      console.log('Missing columns:', missingColumns);
      console.log('\n💡 You may need to update the database schema.');
    } else {
      console.log('\n✅ All required columns exist!');
    }
    
    // Check existing pharmacies
    const pharmaciesQuery = 'SELECT id, name, facility_type, is_active, is_verified FROM healthcare_facilities WHERE facility_type = "pharmacy"';
    const pharmaciesResult = await executeQuery(pharmaciesQuery);
    
    if (pharmaciesResult.success) {
      console.log(`\n📊 Existing pharmacies: ${pharmaciesResult.data.length}`);
      pharmaciesResult.data.forEach(pharmacy => {
        console.log(`  - ID: ${pharmacy.id}, Name: ${pharmacy.name}, Active: ${pharmacy.is_active}, Verified: ${pharmacy.is_verified}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkPharmacySchema();
