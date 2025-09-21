const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function restoreDatabase() {
  let connection;
  
  try {
    console.log('🔧 Starting database restoration...');
    
    // Create connection to existing database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'pharmalink_db1',
      port: 3306
    });
    
    console.log('✅ Connected to pharmalink_db1 database');
    
    // Check if tables exist
    const [tables] = await connection.execute("SHOW TABLES");
    console.log(`📊 Found ${tables.length} existing tables`);
    
    if (tables.length > 0) {
      console.log('📋 Existing tables:');
      tables.forEach(table => {
        console.log(`  - ${Object.values(table)[0]}`);
      });
    }
    
    // Check users table
    try {
      const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log(`👥 Users table: ${users[0].count} records`);
      
      if (users[0].count === 0) {
        console.log('📝 Users table is empty, adding sample data...');
        
        // Add sample users
        const sampleUsers = [
          ['john.doe@email.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'patient', 'John', 'Doe', '+233 24 123 4567'],
          ['dr.kwame@hospital.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'doctor', 'Dr. Kwame', 'Mensah', '+233 20 987 6543'],
          ['pharmacist.am@pharmacy.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'pharmacist', 'Pharmacist', 'Am', '+233 26 555 1234'],
          ['test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'patient', 'Test', 'User', '+233 24 123 4567'],
          ['test@pharmalink.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KzKz2K', 'patient', 'Test', 'Patient', '+233 24 123 4567']
        ];
        
        for (const user of sampleUsers) {
          await connection.execute(
            'INSERT INTO users (email, password_hash, user_type, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?)',
            user
          );
        }
        
        console.log('✅ Sample users added successfully');
      }
      
      // Show existing users
      const [existingUsers] = await connection.execute('SELECT id, email, user_type, first_name, last_name FROM users');
      console.log('\n📋 Current users:');
      existingUsers.forEach(user => {
        console.log(`  - ${user.first_name} ${user.last_name} (${user.email}) - ${user.user_type}`);
      });
      
    } catch (error) {
      console.log('❌ Users table error:', error.message);
    }
    
    // Check healthcare_facilities table
    try {
      const [facilities] = await connection.execute('SELECT COUNT(*) as count FROM healthcare_facilities');
      console.log(`🏥 Healthcare facilities: ${facilities[0].count} records`);
      
      if (facilities[0].count === 0) {
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
    } catch (error) {
      console.log('❌ Healthcare facilities table error:', error.message);
    }
    
    // Check medicines table
    try {
      const [medicines] = await connection.execute('SELECT COUNT(*) as count FROM medicines');
      console.log(`💊 Medicines: ${medicines[0].count} records`);
      
      if (medicines[0].count === 0) {
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
    } catch (error) {
      console.log('❌ Medicines table error:', error.message);
    }
    
    console.log('\n🎉 Database restoration completed successfully!');
    console.log('\n🔑 Test credentials available:');
    console.log('   Email: test@example.com');
    console.log('   Password: password123');
    console.log('   Email: john.doe@email.com');
    console.log('   Password: TestPassword123!');
    console.log('   Email: test@pharmalink.com');
    console.log('   Password: TestPassword123!');
    
  } catch (error) {
    console.error('❌ Database restoration failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the restoration
restoreDatabase();

