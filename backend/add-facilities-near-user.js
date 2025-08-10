const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
});

async function addFacilitiesNearUser() {
  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Database connected successfully to pharmalink_db1');
    
    // User's actual location coordinates
    const userLat = 5.724236955871541;
    const userLon = -0.004141498357061428;
    
    // Create facilities within 5km of user's location
    const nearbyFacilities = [
      {
        name: 'Community Health Center',
        facility_type: 'clinic',
        address: '123 Main Street, Near User Location',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: userLat + 0.001, // ~100m north
        longitude: userLon + 0.001, // ~100m east
        phone: '+233 20 111 1111',
        email: 'info@communityhealth.com',
        website: 'https://communityhealth.com',
        services: 'General Consultation, Vaccinations, Health Screenings, Family Medicine',
        description: 'Community health center providing basic healthcare services',
        rating: 4.3,
        total_reviews: 45,
        is_verified: true,
        is_active: true
      },
      {
        name: 'QuickCare Pharmacy',
        facility_type: 'pharmacy',
        address: '456 Pharmacy Lane, Near User Location',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: userLat - 0.002, // ~200m south
        longitude: userLon - 0.001, // ~100m west
        phone: '+233 20 222 2222',
        email: 'info@quickcarepharmacy.com',
        website: 'https://quickcarepharmacy.com',
        services: 'Prescription Filling, Over-the-counter, Health Consultations, Vaccinations',
        description: 'Quick and reliable pharmacy services',
        rating: 4.1,
        total_reviews: 32,
        is_verified: true,
        is_active: true
      },
      {
        name: 'Neighborhood Medical Clinic',
        facility_type: 'clinic',
        address: '789 Medical Avenue, Near User Location',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: userLat + 0.003, // ~300m north
        longitude: userLon - 0.002, // ~200m west
        phone: '+233 20 333 3333',
        email: 'info@neighborhoodclinic.com',
        website: 'https://neighborhoodclinic.com',
        services: 'General Medicine, Pediatrics, Women Health, Laboratory Services',
        description: 'Comprehensive neighborhood medical clinic',
        rating: 4.5,
        total_reviews: 67,
        is_verified: true,
        is_active: true
      },
      {
        name: 'Express Pharmacy',
        facility_type: 'pharmacy',
        address: '321 Express Street, Near User Location',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: userLat - 0.001, // ~100m south
        longitude: userLon + 0.002, // ~200m east
        phone: '+233 20 444 4444',
        email: 'info@expresspharmacy.com',
        website: 'https://expresspharmacy.com',
        services: 'Prescriptions, OTC Medicines, Health Products, Professional Advice',
        description: 'Express pharmacy with quick service',
        rating: 4.0,
        total_reviews: 28,
        is_verified: true,
        is_active: true
      },
      {
        name: 'Urgent Care Center',
        facility_type: 'hospital',
        address: '654 Urgent Care Road, Near User Location',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: userLat + 0.002, // ~200m north
        longitude: userLon + 0.003, // ~300m east
        phone: '+233 20 555 5555',
        email: 'info@urgentcare.com',
        website: 'https://urgentcare.com',
        services: 'Emergency Care, Urgent Care, Minor Surgery, X-Ray Services',
        description: 'Urgent care center for immediate medical attention',
        rating: 4.4,
        total_reviews: 89,
        is_verified: true,
        is_active: true
      }
    ];
    
    console.log('📝 Adding facilities near user location...');
    for (const facility of nearbyFacilities) {
      const insertQuery = `
        INSERT INTO healthcare_facilities (
          name, facility_type, address, city, state, country,
          latitude, longitude, phone, email, website, services,
          description, rating, total_reviews, is_verified, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        facility.name, facility.facility_type, facility.address,
        facility.city, facility.state, facility.country,
        facility.latitude, facility.longitude, facility.phone,
        facility.email, facility.website, facility.services,
        facility.description, facility.rating, facility.total_reviews,
        facility.is_verified, facility.is_active
      ];
      await connection.promise().query(insertQuery, values);
      console.log(`✅ Created: ${facility.name} at ${facility.latitude}, ${facility.longitude}`);
    }
    
    const [finalCount] = await connection.promise().query('SELECT COUNT(*) as count FROM healthcare_facilities');
    console.log(`\n🎉 Successfully added facilities! Total facilities in database: ${finalCount[0].count}`);
    
    // Test the nearby query with user's coordinates
    console.log('\n🧪 Testing nearby query with user coordinates...');
    const nearbyQuery = `
      SELECT 
        id, name, facility_type, address, city, state, country,
        latitude, longitude, phone, rating, total_reviews,
        (6371 * acos(cos(radians(5.724236955871541)) * cos(radians(latitude)) * 
         cos(radians(-0.004141498357061428) - radians(longitude)) + 
         sin(radians(5.724236955871541)) * sin(radians(latitude)))) AS distance_km
      FROM healthcare_facilities 
      WHERE is_active = TRUE
      HAVING distance_km <= 10
      ORDER BY distance_km ASC
      LIMIT 10
    `;
    
    const [nearbyResult] = await connection.promise().query(nearbyQuery);
    console.log(`✅ Found ${nearbyResult.length} facilities within 10km of user location`);
    
    if (nearbyResult.length > 0) {
      console.log('\n📍 Nearby facilities:');
      nearbyResult.forEach(facility => {
        console.log(`- ${facility.name} (${facility.facility_type}) - ${facility.distance_km.toFixed(2)}km away`);
      });
    }
    
    console.log('\n🚀 Your mobile app should now find nearby facilities!');
    
  } catch (error) {
    console.error('❌ Error adding facilities:', error);
  } finally {
    connection.end();
  }
}

addFacilitiesNearUser(); 