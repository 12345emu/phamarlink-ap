const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
});

async function testFacilitiesTable() {
  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Database connected successfully to pharmalink_db1');
    
    // Check if table exists
    const [tables] = await connection.promise().query('SHOW TABLES LIKE "healthcare_facilities"');
    if (tables.length === 0) {
      console.log('❌ healthcare_facilities table does not exist');
      return;
    }
    console.log('✅ healthcare_facilities table exists');
    
    // Count facilities
    const [countResult] = await connection.promise().query('SELECT COUNT(*) as count FROM healthcare_facilities');
    console.log(`📊 Total facilities: ${countResult[0].count}`);
    
    // Show sample facilities
    const [facilities] = await connection.promise().query('SELECT name, facility_type, city, latitude, longitude FROM healthcare_facilities LIMIT 5');
    console.log('\n📍 Sample facilities:');
    facilities.forEach(facility => {
      console.log(`- ${facility.name} (${facility.facility_type}) in ${facility.city} at ${facility.latitude}, ${facility.longitude}`);
    });
    
    // Test the nearby query
    console.log('\n🧪 Testing nearby query...');
    const nearbyQuery = `
      SELECT 
        id, name, facility_type, address, city, state, country,
        latitude, longitude, phone, rating, total_reviews,
        (6371 * acos(cos(radians(5.5600)) * cos(radians(latitude)) * 
         cos(radians(-0.2057) - radians(longitude)) + 
         sin(radians(5.5600)) * sin(radians(latitude)))) AS distance_km
      FROM healthcare_facilities 
      WHERE is_active = TRUE
      HAVING distance_km <= 10
      ORDER BY distance_km ASC
      LIMIT 5
    `;
    
    const [nearbyResult] = await connection.promise().query(nearbyQuery);
    console.log(`✅ Nearby query successful! Found ${nearbyResult.length} facilities`);
    
    if (nearbyResult.length > 0) {
      console.log('\n📍 Nearby facilities:');
      nearbyResult.forEach(facility => {
        console.log(`- ${facility.name} (${facility.facility_type}) - ${facility.distance_km}km away`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    connection.end();
  }
}

testFacilitiesTable(); 