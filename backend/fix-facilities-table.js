const mysql = require('mysql2/promise');

async function fixFacilitiesTable() {
  let connection;
  
  try {
    console.log('🔧 Fixing healthcare_facilities table...');
    
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'pharmalink_db1',
      port: 3306
    });
    
    console.log('✅ Connected to pharmalink_db1 database');
    
    // Check if images column exists
    const [columns] = await connection.execute("DESCRIBE healthcare_facilities");
    const columnNames = columns.map(col => col.Field);
    
    console.log('📋 Current columns:', columnNames);
    
    // Add missing columns
    const missingColumns = [
      { name: 'images', type: 'JSON' },
      { name: 'user_id', type: 'INT' },
      { name: 'owner_name', type: 'VARCHAR(100)' },
      { name: 'postal_code', type: 'VARCHAR(20)' },
      { name: 'license_number', type: 'VARCHAR(100)' },
      { name: 'registration_number', type: 'VARCHAR(100)' },
      { name: 'emergency_contact', type: 'VARCHAR(20)' },
      { name: 'bed_capacity', type: 'INT' },
      { name: 'has_emergency', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'has_icu', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'has_ambulance', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'accepts_insurance', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'has_delivery', type: 'BOOLEAN DEFAULT FALSE' },
      { name: 'has_consultation', type: 'BOOLEAN DEFAULT FALSE' }
    ];
    
    for (const column of missingColumns) {
      if (!columnNames.includes(column.name)) {
        console.log(`📝 Adding ${column.name} column to healthcare_facilities table`);
        try {
          await connection.execute(`ALTER TABLE healthcare_facilities ADD COLUMN ${column.name} ${column.type}`);
          console.log(`✅ Column ${column.name} added successfully`);
        } catch (error) {
          console.log(`⚠️ Error adding ${column.name}:`, error.message);
        }
      } else {
        console.log(`✅ Column ${column.name} already exists`);
      }
    }
    
    // Update existing facilities with some default values
    console.log('\n📝 Updating existing facilities with default values...');
    
    const updateQueries = [
      "UPDATE healthcare_facilities SET images = '[]' WHERE images IS NULL",
      "UPDATE healthcare_facilities SET user_id = 1 WHERE user_id IS NULL",
      "UPDATE healthcare_facilities SET owner_name = 'System Admin' WHERE owner_name IS NULL",
      "UPDATE healthcare_facilities SET license_number = CONCAT('LIC-', id) WHERE license_number IS NULL",
      "UPDATE healthcare_facilities SET emergency_contact = phone WHERE emergency_contact IS NULL",
      "UPDATE healthcare_facilities SET accepts_insurance = TRUE WHERE accepts_insurance IS NULL",
      "UPDATE healthcare_facilities SET has_delivery = TRUE WHERE has_delivery IS NULL",
      "UPDATE healthcare_facilities SET has_consultation = TRUE WHERE has_consultation IS NULL"
    ];
    
    for (const query of updateQueries) {
      try {
        const [result] = await connection.execute(query);
        console.log(`✅ Updated: ${result.affectedRows} rows`);
      } catch (error) {
        console.log(`⚠️ Update warning:`, error.message);
      }
    }
    
    // Verify the table structure
    console.log('\n🧪 Verifying table structure...');
    const [updatedColumns] = await connection.execute("DESCRIBE healthcare_facilities");
    console.log(`📊 Total columns: ${updatedColumns.length}`);
    
    // Test a simple query
    const [testResult] = await connection.execute('SELECT COUNT(*) as count FROM healthcare_facilities WHERE is_active = TRUE');
    console.log(`📊 Active facilities: ${testResult[0].count}`);
    
    // Test the nearby query
    console.log('\n🧪 Testing nearby facilities query...');
    const nearbyQuery = `
      SELECT 
        id, name, facility_type, address, city, state, country,
        latitude, longitude, phone, rating, total_reviews, services, images,
        (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
         cos(radians(longitude) - radians(?)) + 
         sin(radians(?)) * sin(radians(latitude)))) AS distance_km
      FROM healthcare_facilities 
      WHERE is_active = TRUE
      HAVING distance_km <= ?
      ORDER BY distance_km ASC
      LIMIT ?
    `;
    
    try {
      const [nearbyResult] = await connection.execute(nearbyQuery, [5.5600, -0.2057, 5.5600, 10, 20]);
      console.log(`✅ Nearby query test successful: Found ${nearbyResult.length} facilities`);
      
      if (nearbyResult.length > 0) {
        console.log('📋 Sample results:');
        nearbyResult.slice(0, 3).forEach((facility, index) => {
          console.log(`  ${index + 1}. ${facility.name} (${facility.facility_type}) - ${facility.distance_km}km`);
        });
      }
    } catch (error) {
      console.log('❌ Nearby query test failed:', error.message);
    }
    
    console.log('\n🎉 Healthcare facilities table fix completed!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

fixFacilitiesTable();












