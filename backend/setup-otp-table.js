const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pharmalink_db1',
  port: process.env.DB_PORT || 3306
};

async function setupOTPTable() {
  let connection;
  
  try {
    console.log('🔍 Setting up OTP table...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Create password_reset_otps table
    const createOTPTable = `
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        verified_at TIMESTAMP NULL,
        attempts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_email (email),
        INDEX idx_otp_code (otp_code),
        INDEX idx_expires_at (expires_at)
      )
    `;
    
    await connection.execute(createOTPTable);
    console.log('✅ Password reset OTP table created/verified');
    
    // Clean up expired OTPs (older than 24 hours)
    const cleanupQuery = `
      DELETE FROM password_reset_otps 
      WHERE expires_at < NOW() OR created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `;
    await connection.execute(cleanupQuery);
    console.log('✅ Cleaned up expired OTPs');
    
    connection.end();
    console.log('🎉 OTP table setup completed successfully!');
  } catch (error) {
    console.error('❌ Error setting up OTP table:', error);
    if (connection) {
      connection.end();
    }
    process.exit(1);
  }
}

setupOTPTable();

