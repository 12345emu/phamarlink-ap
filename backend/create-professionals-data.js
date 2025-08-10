const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
});

async function createProfessionalsData() {
  try {
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Database connected successfully to pharmalink_db1');
    
    // Create healthcare_professionals table
    console.log('\n📋 Creating healthcare_professionals table...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS healthcare_professionals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        specialty VARCHAR(100) NOT NULL,
        qualification VARCHAR(100),
        experience_years INT DEFAULT 0,
        rating DECIMAL(3,2) DEFAULT 0.00,
        total_reviews INT DEFAULT 0,
        is_available BOOLEAN DEFAULT TRUE,
        is_verified BOOLEAN DEFAULT FALSE,
        profile_image VARCHAR(255),
        bio TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await connection.promise().query(createTableQuery);
    console.log('✅ healthcare_professionals table created/verified');
    
    // Check if table has data
    const [existingCount] = await connection.promise().query('SELECT COUNT(*) as count FROM healthcare_professionals');
    
    if (existingCount[0].count === 0) {
      console.log('\n📝 Adding sample healthcare professionals...');
      
      const professionals = [
        {
          first_name: 'Kwame',
          last_name: 'Mensah',
          email: 'dr.kwame.mensah@pharmalink.com',
          phone: '+233 20 111 2222',
          specialty: 'General Medicine',
          qualification: 'MBChB, MD',
          experience_years: 8,
          rating: 4.7,
          total_reviews: 156,
          is_available: true,
          is_verified: true,
          profile_image: 'https://randomuser.me/api/portraits/men/32.jpg',
          bio: 'Experienced general practitioner with expertise in family medicine and preventive care.'
        },
        {
          first_name: 'Ama',
          last_name: 'Osei',
          email: 'dr.ama.osei@pharmalink.com',
          phone: '+233 20 333 4444',
          specialty: 'Pediatrics',
          qualification: 'MBChB, MD Pediatrics',
          experience_years: 12,
          rating: 4.9,
          total_reviews: 203,
          is_available: true,
          is_verified: true,
          profile_image: 'https://randomuser.me/api/portraits/women/44.jpg',
          bio: 'Specialized pediatrician with over 12 years of experience in child healthcare.'
        },
        {
          first_name: 'Kofi',
          last_name: 'Addo',
          email: 'dr.kofi.addo@pharmalink.com',
          phone: '+233 20 555 6666',
          specialty: 'Cardiology',
          qualification: 'MBChB, MD Cardiology',
          experience_years: 15,
          rating: 4.8,
          total_reviews: 189,
          is_available: false,
          is_verified: true,
          profile_image: 'https://randomuser.me/api/portraits/men/67.jpg',
          bio: 'Senior cardiologist with extensive experience in heart disease treatment and prevention.'
        },
        {
          first_name: 'Efua',
          last_name: 'Boateng',
          email: 'dr.efua.boateng@pharmalink.com',
          phone: '+233 20 777 8888',
          specialty: 'Dermatology',
          qualification: 'MBChB, MD Dermatology',
          experience_years: 10,
          rating: 4.6,
          total_reviews: 134,
          is_available: true,
          is_verified: true,
          profile_image: 'https://randomuser.me/api/portraits/women/23.jpg',
          bio: 'Dermatologist specializing in skin conditions and cosmetic dermatology.'
        },
        {
          first_name: 'Yaw',
          last_name: 'Darko',
          email: 'dr.yaw.darko@pharmalink.com',
          phone: '+233 20 999 0000',
          specialty: 'Orthopedics',
          qualification: 'MBChB, MD Orthopedics',
          experience_years: 18,
          rating: 4.9,
          total_reviews: 267,
          is_available: true,
          is_verified: true,
          profile_image: 'https://randomuser.me/api/portraits/men/89.jpg',
          bio: 'Orthopedic surgeon with expertise in joint replacement and sports medicine.'
        }
      ];
      
      for (const professional of professionals) {
        const insertQuery = `
          INSERT INTO healthcare_professionals (
            first_name, last_name, email, phone, specialty, qualification,
            experience_years, rating, total_reviews, is_available, is_verified,
            profile_image, bio
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
          professional.first_name, professional.last_name, professional.email,
          professional.phone, professional.specialty, professional.qualification,
          professional.experience_years, professional.rating, professional.total_reviews,
          professional.is_available, professional.is_verified, professional.profile_image,
          professional.bio
        ];
        
        await connection.promise().query(insertQuery, values);
        console.log(`✅ Created: Dr. ${professional.first_name} ${professional.last_name} (${professional.specialty})`);
      }
    } else {
      console.log(`📊 Found ${existingCount[0].count} existing professionals`);
    }
    
    // Add pharmacy_medicines data
    console.log('\n💊 Adding pharmacy_medicines data...');
    
    // First, let's get some pharmacy IDs
    const [pharmacies] = await connection.promise().query('SELECT id FROM healthcare_facilities WHERE facility_type = "pharmacy" LIMIT 3');
    
    if (pharmacies.length > 0) {
      // Get medicines
      const [medicines] = await connection.promise().query('SELECT id, name, category FROM medicines');
      
      if (medicines.length > 0) {
        const pharmacyMedicines = [];
        
        // Create pharmacy_medicines entries
        for (const pharmacy of pharmacies) {
          for (const medicine of medicines) {
            pharmacyMedicines.push({
              pharmacy_id: pharmacy.id,
              medicine_id: medicine.id,
              price: Math.floor(Math.random() * 50) + 10, // Random price between 10-60 GHS
              stock_quantity: Math.floor(Math.random() * 100) + 10, // Random stock between 10-110
              is_available: true
            });
          }
        }
        
        // Insert pharmacy_medicines data
        for (const item of pharmacyMedicines) {
          const insertQuery = `
            INSERT INTO pharmacy_medicines (pharmacy_id, medicine_id, price, stock_quantity, is_available)
            VALUES (?, ?, ?, ?, ?)
          `;
          
          await connection.promise().query(insertQuery, [
            item.pharmacy_id, item.medicine_id, item.price, item.stock_quantity, item.is_available
          ]);
        }
        
        console.log(`✅ Added ${pharmacyMedicines.length} pharmacy_medicines entries`);
      }
    }
    
    // Show final counts
    const [finalProfessionalsCount] = await connection.promise().query('SELECT COUNT(*) as count FROM healthcare_professionals');
    const [finalPharmacyMedicinesCount] = await connection.promise().query('SELECT COUNT(*) as count FROM pharmacy_medicines');
    
    console.log(`\n🎉 Database setup complete!`);
    console.log(`📊 Healthcare professionals: ${finalProfessionalsCount[0].count}`);
    console.log(`💊 Pharmacy medicines: ${finalPharmacyMedicinesCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating professionals data:', error);
  } finally {
    connection.end();
  }
}

createProfessionalsData(); 