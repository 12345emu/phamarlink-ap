const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
});

async function createSampleFacilities() {
  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Database connected successfully to pharmalink_db1');

    // Check if healthcare_facilities table exists
    const [tables] = await connection.promise().query('SHOW TABLES LIKE "healthcare_facilities"');
    
    if (tables.length === 0) {
      console.log('📋 Creating healthcare_facilities table...');
      
      const createTableQuery = `
        CREATE TABLE healthcare_facilities (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          facility_type ENUM('hospital', 'pharmacy', 'clinic') NOT NULL,
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          country VARCHAR(100) DEFAULT 'Ghana',
          latitude DECIMAL(10, 8) NOT NULL,
          longitude DECIMAL(11, 8) NOT NULL,
          phone VARCHAR(50),
          email VARCHAR(255),
          website VARCHAR(255),
          services TEXT,
          description TEXT,
          rating DECIMAL(3, 2) DEFAULT 0.00,
          total_reviews INT DEFAULT 0,
          is_verified BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;
      
      await connection.promise().query(createTableQuery);
      console.log('✅ healthcare_facilities table created');
    } else {
      console.log('✅ healthcare_facilities table already exists');
    }

    // Check if there are existing facilities
    const [existingFacilities] = await connection.promise().query('SELECT COUNT(*) as count FROM healthcare_facilities');
    
    if (existingFacilities[0].count > 0) {
      console.log(`📊 Found ${existingFacilities[0].count} existing facilities`);
      console.log('🔄 Clearing existing facilities to create fresh sample data...');
      await connection.promise().query('DELETE FROM healthcare_facilities');
    }

    // Sample facilities data (Accra, Ghana area)
    const sampleFacilities = [
      {
        name: 'Holy Family Hospital',
        facility_type: 'hospital',
        address: '123 Hospital Road, Adabraka',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: 5.5600,
        longitude: -0.2057,
        phone: '+233 20 123 4567',
        email: 'info@holyfamilyhospital.com',
        website: 'https://holyfamilyhospital.com',
        services: 'Emergency Care, Surgery, Maternity, Pediatrics, Cardiology, Neurology',
        description: 'A leading healthcare facility providing comprehensive medical services',
        rating: 4.5,
        total_reviews: 128,
        is_verified: true,
        is_active: true
      },
      {
        name: 'CityMed Pharmacy',
        facility_type: 'pharmacy',
        address: '456 Pharmacy Street, Osu',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: 5.5650,
        longitude: -0.2100,
        phone: '+233 20 987 6543',
        email: 'info@citymedpharmacy.com',
        website: 'https://citymedpharmacy.com',
        services: 'Prescription Filling, Over-the-counter, Health Consultations, Vaccinations',
        description: 'Your trusted neighborhood pharmacy with professional service',
        rating: 4.2,
        total_reviews: 89,
        is_verified: true,
        is_active: true
      },
      {
        name: 'East Legon Clinic',
        facility_type: 'clinic',
        address: '789 Clinic Avenue, East Legon',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: 5.5550,
        longitude: -0.2000,
        phone: '+233 20 555 1234',
        email: 'info@eastlegonclinic.com',
        website: 'https://eastlegonclinic.com',
        services: 'General Consultation, Specialized Care, Laboratory, X-Ray, Ultrasound',
        description: 'Specialized medical clinic with modern diagnostic facilities',
        rating: 4.0,
        total_reviews: 67,
        is_verified: true,
        is_active: true
      },
      {
        name: 'Korle Bu Teaching Hospital',
        facility_type: 'hospital',
        address: '1 Hospital Road, Korle Bu',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: 5.5400,
        longitude: -0.2200,
        phone: '+233 20 111 2222',
        email: 'info@korlebu.com',
        website: 'https://korlebu.com',
        services: 'Teaching Hospital, Research, Specialized Surgery, Cancer Treatment, Trauma Center',
        description: 'Premier teaching hospital and referral center for Ghana',
        rating: 4.7,
        total_reviews: 256,
        is_verified: true,
        is_active: true
      },
      {
        name: 'MedPlus Pharmacy',
        facility_type: 'pharmacy',
        address: '321 Medical Street, Cantonments',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: 5.5700,
        longitude: -0.1950,
        phone: '+233 20 333 4444',
        email: 'info@medpluspharmacy.com',
        website: 'https://medpluspharmacy.com',
        services: 'Prescription Drugs, Health Supplements, Medical Equipment, Consultations',
        description: 'Premium pharmacy with wide range of medical products',
        rating: 4.3,
        total_reviews: 95,
        is_verified: true,
        is_active: true
      },
      {
        name: 'Ridge Hospital',
        facility_type: 'hospital',
        address: '456 Ridge Road, Ridge',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: 5.5500,
        longitude: -0.1900,
        phone: '+233 20 555 6666',
        email: 'info@ridgehospital.com',
        website: 'https://ridgehospital.com',
        services: 'General Medicine, Surgery, Obstetrics, Pediatrics, Emergency Care',
        description: 'Modern hospital serving the Ridge and surrounding communities',
        rating: 4.4,
        total_reviews: 112,
        is_verified: true,
        is_active: true
      },
      {
        name: 'HealthFirst Clinic',
        facility_type: 'clinic',
        address: '789 Health Street, Airport Residential',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: 5.5800,
        longitude: -0.1850,
        phone: '+233 20 777 8888',
        email: 'info@healthfirstclinic.com',
        website: 'https://healthfirstclinic.com',
        services: 'Family Medicine, Preventive Care, Vaccinations, Health Screenings',
        description: 'Family-focused clinic emphasizing preventive healthcare',
        rating: 4.1,
        total_reviews: 73,
        is_verified: true,
        is_active: true
      },
      {
        name: 'PharmaCare Plus',
        facility_type: 'pharmacy',
        address: '123 Care Street, Labone',
        city: 'Accra',
        state: 'Greater Accra',
        country: 'Ghana',
        latitude: 5.5450,
        longitude: -0.2150,
        phone: '+233 20 999 0000',
        email: 'info@pharmacareplus.com',
        website: 'https://pharmacareplus.com',
        services: 'Prescriptions, OTC Medicines, Health Products, Professional Advice',
        description: 'Community pharmacy committed to health and wellness',
        rating: 4.0,
        total_reviews: 58,
        is_verified: true,
        is_active: true
      }
    ];

    console.log('📝 Inserting sample facilities...');
    
    for (const facility of sampleFacilities) {
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
      console.log(`✅ Created: ${facility.name}`);
    }

    // Verify the data
    const [finalCount] = await connection.promise().query('SELECT COUNT(*) as count FROM healthcare_facilities');
    console.log(`\n🎉 Successfully created ${finalCount[0].count} sample facilities!`);
    
    // Show sample data
    const [sampleData] = await connection.promise().query('SELECT name, facility_type, city, latitude, longitude FROM healthcare_facilities LIMIT 3');
    console.log('\n📋 Sample facilities:');
    sampleData.forEach(facility => {
      console.log(`- ${facility.name} (${facility.facility_type}) in ${facility.city} at ${facility.latitude}, ${facility.longitude}`);
    });

    console.log('\n🚀 You can now test the nearby facilities search in your mobile app!');
    console.log('📍 Test coordinates: Accra, Ghana (5.5600, -0.2057)');

  } catch (error) {
    console.error('❌ Error creating sample facilities:', error);
  } finally {
    connection.end();
  }
}

createSampleFacilities(); 