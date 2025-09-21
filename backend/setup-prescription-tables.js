const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pharmalink_db1',
  port: process.env.DB_PORT || 3306
};

async function setupPrescriptionTables() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Read the prescription tables SQL file
    const sqlFilePath = path.join(__dirname, 'database', 'prescription_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('🔍 Executing prescription tables SQL...');
    
    // Split the SQL content by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => {
        // Remove comments and empty statements
        const cleanStmt = stmt.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
        return cleanStmt.length > 0;
      });

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('🔍 Executing:', statement.substring(0, 100) + '...');
        await connection.execute(statement);
      }
    }

    console.log('✅ Prescription tables created successfully!');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('prescription_medicines', 'prescription_uploads')
    `, [dbConfig.database]);

    console.log('✅ Found tables:', tables.map(t => t.TABLE_NAME));

  } catch (error) {
    console.error('❌ Error setting up prescription tables:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔍 Database connection closed');
    }
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupPrescriptionTables()
    .then(() => {
      console.log('🎉 Prescription tables setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Prescription tables setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupPrescriptionTables };
