const { executeQuery } = require('./config/database');

async function setupPushTokensTable() {
  try {
    console.log('🔧 Setting up push_tokens table...');
    
    // Create push_tokens table
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS push_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        user_type ENUM('patient', 'doctor', 'pharmacist', 'admin') NOT NULL,
        token VARCHAR(500) NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        platform ENUM('ios', 'android', 'web') NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_device (user_id, device_id),
        INDEX idx_user_id (user_id),
        INDEX idx_user_type (user_type),
        INDEX idx_token (token),
        INDEX idx_active (is_active)
      )
    `;
    
    const result = await executeQuery(createTableQuery);
    
    if (result.success) {
      console.log('✅ Push tokens table created successfully');
    } else {
      console.error('❌ Failed to create push tokens table:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error setting up push tokens table:', error);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  setupPushTokensTable()
    .then(result => {
      if (result.success) {
        console.log('✅ Push tokens table setup completed');
        process.exit(0);
      } else {
        console.error('❌ Push tokens table setup failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Push tokens table setup error:', error);
      process.exit(1);
    });
}

module.exports = setupPushTokensTable;
