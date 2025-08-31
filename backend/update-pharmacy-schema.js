const { executeQuery } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function updatePharmacySchema() {
  try {
    console.log('🔍 Updating healthcare_facilities table schema for pharmacy registration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'update-pharmacy-schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('USE'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`🔍 Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const result = await executeQuery(statement);
          if (result.success) {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          } else {
            console.log(`⚠️ Statement ${i + 1} result:`, result);
          }
        } catch (error) {
          console.log(`❌ Error executing statement ${i + 1}:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Schema update completed!');
    
    // Verify the update
    console.log('\n🔍 Verifying schema update...');
    const verifyQuery = 'DESCRIBE healthcare_facilities';
    const verifyResult = await executeQuery(verifyQuery);
    
    if (verifyResult.success) {
      const columns = verifyResult.data.map(col => col.Field);
      const requiredColumns = [
        'owner_name', 'postal_code', 'license_number', 'registration_number',
        'emergency_contact', 'accepts_insurance', 'has_delivery', 'has_consultation', 'images'
      ];
      
      console.log('📋 Checking required columns:');
      requiredColumns.forEach(column => {
        if (columns.includes(column)) {
          console.log(`  ✅ ${column}`);
        } else {
          console.log(`  ❌ ${column} - STILL MISSING`);
        }
      });
      
      const stillMissing = requiredColumns.filter(col => !columns.includes(col));
      if (stillMissing.length === 0) {
        console.log('\n✅ All required columns are now present!');
        console.log('💡 Pharmacy registration should now work.');
      } else {
        console.log('\n❌ Some columns are still missing:', stillMissing);
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating schema:', error);
  }
}

updatePharmacySchema();
