const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function createDefaultPharmacy() {
  let connection;
  
  try {
    console.log('🔍 Checking for default pharmacy...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Check if pharmacy with ID 1 exists
    const [existingPharmacy] = await connection.execute('SELECT id, name, facility_type FROM healthcare_facilities WHERE id = 1');
    
    if (existingPharmacy.length > 0) {
      console.log('✅ Default pharmacy already exists:');
      console.log(`   ID: ${existingPharmacy[0].id}, Name: ${existingPharmacy[0].name}, Type: ${existingPharmacy[0].facility_type}`);
    } else {
      console.log('⚠️ Default pharmacy not found. Creating one...');
      
      // Create a default pharmacy
      const insertQuery = `
        INSERT INTO healthcare_facilities (
          id, name, facility_type, address, city, state, country, phone, email, 
          description, rating, operating_hours, services, created_at, updated_at
        ) VALUES (
          1, 'Default Pharmacy', 'pharmacy', '123 Main Street', 'Accra', 'Greater Accra', 'Ghana',
          '+233 20 123 4567', 'info@defaultpharmacy.com', 'Your trusted pharmacy for all your medicine needs',
          4.5, '{"monday": "8:00-18:00", "tuesday": "8:00-18:00", "wednesday": "8:00-18:00", "thursday": "8:00-18:00", "friday": "8:00-18:00", "saturday": "9:00-17:00", "sunday": "10:00-16:00"}',
          '["Prescription Filling", "Health Consultations", "Delivery Service", "Insurance Accepted", "Vaccinations", "Health Monitoring"]',
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `;
      
      await connection.execute(insertQuery);
      console.log('✅ Default pharmacy created successfully!');
      console.log('   ID: 1, Name: Default Pharmacy, Type: pharmacy');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

createDefaultPharmacy(); 