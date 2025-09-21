const { executeQuery } = require('./config/database');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database...');
    
    // Create users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        user_type ENUM('patient', 'doctor', 'pharmacist', 'admin') NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        date_of_birth DATE,
        profile_image VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    const usersResult = await executeQuery(createUsersTable);
    console.log('✅ Users table created:', usersResult.success);
    
    // Create patient_profiles table
    const createPatientProfilesTable = `
      CREATE TABLE IF NOT EXISTS patient_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        emergency_contact VARCHAR(20),
        emergency_contact_name VARCHAR(100),
        insurance_provider VARCHAR(100),
        insurance_number VARCHAR(100),
        blood_type ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
        allergies TEXT,
        medical_history TEXT,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'Ghana',
        postal_code VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `;
    
    const profilesResult = await executeQuery(createPatientProfilesTable);
    console.log('✅ Patient profiles table created:', profilesResult.success);
    
    // Check if test user exists
    const checkUser = await executeQuery('SELECT id FROM users WHERE email = ?', ['test@example.com']);
    
    if (!checkUser.success || checkUser.data.length === 0) {
      // Create test user
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      const insertUser = `
        INSERT INTO users (email, password_hash, user_type, first_name, last_name, phone)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const userResult = await executeQuery(insertUser, [
        'test@example.com',
        hashedPassword,
        'patient',
        'Test',
        'User',
        '+233 24 123 4567'
      ]);
      
      if (userResult.success) {
        console.log('✅ Test user created successfully');
        console.log('📧 Email: test@example.com');
        console.log('🔑 Password: password123');
        
        // Create patient profile
        const userId = userResult.data.insertId;
        const profileResult = await executeQuery(
          'INSERT INTO patient_profiles (user_id) VALUES (?)',
          [userId]
        );
        console.log('✅ Patient profile created:', profileResult.success);
      } else {
        console.log('❌ Failed to create test user:', userResult.error);
      }
    } else {
      console.log('✅ Test user already exists');
    }
    
    console.log('🎉 Database setup completed!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  }
}

setupDatabase();

