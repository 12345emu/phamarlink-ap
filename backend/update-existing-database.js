const mysql = require('mysql2/promise');
const { executeQuery } = require('./config/database');

async function updateExistingDatabase() {
  let connection;
  
  try {
    console.log('🔧 Starting database update...');
    
    // Connect to the existing database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'pharmalink_db1',
      port: 3306
    });
    
    console.log('✅ Connected to pharmalink_db1 database');
    
    // Check current tables
    const [tables] = await connection.execute("SHOW TABLES");
    console.log(`📊 Found ${tables.length} existing tables`);
    
    const existingTables = tables.map(table => Object.values(table)[0]);
    console.log('📋 Existing tables:', existingTables);
    
    // Define all required tables with their schemas
    const requiredTables = {
      'healthcare_professionals': `
        CREATE TABLE IF NOT EXISTS healthcare_professionals (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          facility_id INT,
          license_number VARCHAR(100),
          specialization VARCHAR(100),
          experience_years INT,
          education TEXT,
          certifications TEXT,
          bio TEXT,
          consultation_fee DECIMAL(10,2),
          is_available BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE SET NULL
        )
      `,
      'order_tracking': `
        CREATE TABLE IF NOT EXISTS order_tracking (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          status ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled') NOT NULL,
          location VARCHAR(255),
          notes TEXT,
          updated_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `,
      'cart_items': `
        CREATE TABLE IF NOT EXISTS cart_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          pharmacy_medicine_id INT NOT NULL,
          quantity INT NOT NULL,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (pharmacy_medicine_id) REFERENCES pharmacy_medicines(id) ON DELETE CASCADE
        )
      `,
      'facility_reviews': `
        CREATE TABLE IF NOT EXISTS facility_reviews (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          facility_id INT NOT NULL,
          rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
          review_text TEXT,
          is_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (facility_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE
        )
      `
    };
    
    // Create missing tables
    for (const [tableName, createSQL] of Object.entries(requiredTables)) {
      if (!existingTables.includes(tableName)) {
        console.log(`📝 Creating missing table: ${tableName}`);
        await connection.execute(createSQL);
        console.log(`✅ Table ${tableName} created successfully`);
      } else {
        console.log(`✅ Table ${tableName} already exists`);
      }
    }
    
    // Add missing columns to existing tables
    console.log('\n🔍 Checking for missing columns...');
    
    // Check users table for missing columns
    const [userColumns] = await connection.execute("DESCRIBE users");
    const userColumnNames = userColumns.map(col => col.Field);
    
    if (!userColumnNames.includes('email_verified')) {
      console.log('📝 Adding email_verified column to users table');
      await connection.execute("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE");
    }
    
    // Check healthcare_facilities table for missing columns
    const [facilityColumns] = await connection.execute("DESCRIBE healthcare_facilities");
    const facilityColumnNames = facilityColumns.map(col => col.Field);
    
    const missingFacilityColumns = [
      { name: 'operating_hours', type: 'JSON' },
      { name: 'services', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'rating', type: 'DECIMAL(3,2) DEFAULT 0' },
      { name: 'total_reviews', type: 'INT DEFAULT 0' },
      { name: 'is_verified', type: 'BOOLEAN DEFAULT FALSE' }
    ];
    
    for (const column of missingFacilityColumns) {
      if (!facilityColumnNames.includes(column.name)) {
        console.log(`📝 Adding ${column.name} column to healthcare_facilities table`);
        await connection.execute(`ALTER TABLE healthcare_facilities ADD COLUMN ${column.name} ${column.type}`);
      }
    }
    
    // Check medicines table for missing columns
    const [medicineColumns] = await connection.execute("DESCRIBE medicines");
    const medicineColumnNames = medicineColumns.map(col => col.Field);
    
    const missingMedicineColumns = [
      { name: 'active_ingredients', type: 'TEXT' },
      { name: 'side_effects', type: 'TEXT' },
      { name: 'contraindications', type: 'TEXT' }
    ];
    
    for (const column of missingMedicineColumns) {
      if (!medicineColumnNames.includes(column.name)) {
        console.log(`📝 Adding ${column.name} column to medicines table`);
        await connection.execute(`ALTER TABLE medicines ADD COLUMN ${column.name} ${column.type}`);
      }
    }
    
    // Create indexes
    console.log('\n📊 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type)',
      'CREATE INDEX IF NOT EXISTS idx_facilities_location ON healthcare_facilities(latitude, longitude)',
      'CREATE INDEX IF NOT EXISTS idx_facilities_type ON healthcare_facilities(facility_type)',
      'CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name)',
      'CREATE INDEX IF NOT EXISTS idx_pharmacy_medicines_pharmacy ON pharmacy_medicines(pharmacy_id)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)',
      'CREATE INDEX IF NOT EXISTS idx_orders_patient ON orders(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_chat_conversations_users ON chat_conversations(patient_id, professional_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_order_tracking_order ON order_tracking(order_id)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await connection.execute(indexSQL);
        console.log(`✅ Index created: ${indexSQL.split(' ')[5]}`);
      } catch (error) {
        console.log(`⚠️ Index warning: ${error.message}`);
      }
    }
    
    // Add sample data if tables are empty
    console.log('\n📝 Checking and adding sample data...');
    
    // Check and add healthcare professionals
    const [profCount] = await connection.execute('SELECT COUNT(*) as count FROM healthcare_professionals');
    if (profCount[0].count === 0) {
      console.log('📝 Adding sample healthcare professionals...');
      const sampleProfessionals = [
        [2, 1, 'MD123456', 'General Medicine', 10],
        [3, 2, 'PH123456', 'Pharmacy', 8]
      ];
      
      for (const prof of sampleProfessionals) {
        await connection.execute(
          'INSERT INTO healthcare_professionals (user_id, facility_id, license_number, specialization, experience_years) VALUES (?, ?, ?, ?, ?)',
          prof
        );
      }
      console.log('✅ Sample healthcare professionals added');
    }
    
    // Check and add sample medicines
    const [medCount] = await connection.execute('SELECT COUNT(*) as count FROM medicines');
    if (medCount[0].count === 0) {
      console.log('📝 Adding sample medicines...');
      const sampleMedicines = [
        ['Paracetamol', 'Acetaminophen', 'Tylenol', 'Pain reliever and fever reducer', 'Analgesic', false, 'tablet', '500mg', 'Generic Pharmaceuticals'],
        ['Amoxicillin', 'Amoxicillin', 'Amoxil', 'Antibiotic for bacterial infections', 'Antibiotic', true, 'capsule', '250mg', 'PharmaCorp'],
        ['Ibuprofen', 'Ibuprofen', 'Advil', 'Anti-inflammatory pain reliever', 'NSAID', false, 'tablet', '400mg', 'Pain Relief Inc']
      ];
      
      for (const medicine of sampleMedicines) {
        await connection.execute(
          'INSERT INTO medicines (name, generic_name, brand_name, description, category, prescription_required, dosage_form, strength, manufacturer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          medicine
        );
      }
      console.log('✅ Sample medicines added');
    }
    
    // Check and add sample healthcare facilities
    const [facilityCount] = await connection.execute('SELECT COUNT(*) as count FROM healthcare_facilities');
    if (facilityCount[0].count === 0) {
      console.log('📝 Adding sample healthcare facilities...');
      const sampleFacilities = [
        ['Holy Family Hospital', 'hospital', '123 Hospital Road, Accra', 'Accra', 5.5600, -0.2057, '+233 30 123 4567'],
        ['CityMed Pharmacy', 'pharmacy', '456 Pharmacy Street, Accra', 'Accra', 5.5650, -0.2100, '+233 30 987 6543'],
        ['East Legon Clinic', 'clinic', '789 Clinic Avenue, Accra', 'Accra', 5.5550, -0.2000, '+233 30 555 1234']
      ];
      
      for (const facility of sampleFacilities) {
        await connection.execute(
          'INSERT INTO healthcare_facilities (name, facility_type, address, city, latitude, longitude, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
          facility
        );
      }
      console.log('✅ Sample healthcare facilities added');
    }
    
    // Final verification
    console.log('\n🧪 Final verification...');
    const [finalTables] = await connection.execute("SHOW TABLES");
    console.log(`📊 Total tables: ${finalTables.length}`);
    
    const [finalUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Total users: ${finalUsers[0].count}`);
    
    const [finalFacilities] = await connection.execute('SELECT COUNT(*) as count FROM healthcare_facilities');
    console.log(`🏥 Total facilities: ${finalFacilities[0].count}`);
    
    const [finalMedicines] = await connection.execute('SELECT COUNT(*) as count FROM medicines');
    console.log(`💊 Total medicines: ${finalMedicines[0].count}`);
    
    console.log('\n🎉 Database update completed successfully!');
    console.log('\n🔑 Available test credentials:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    console.log('   Email: john.doe@email.com');
    console.log('   Password: TestPassword123!');
    
  } catch (error) {
    console.error('❌ Database update failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the update
updateExistingDatabase();

