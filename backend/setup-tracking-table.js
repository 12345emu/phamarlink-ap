const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function setupTrackingTable() {
  let connection;
  
  try {
    console.log('🔍 Setting up tracking table...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'database', 'tracking_table.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split the SQL content into individual statements
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
        console.log('✅ Executed:', statement.trim().substring(0, 50) + '...');
      }
    }
    
    // Check table structure
    const [columns] = await connection.execute('DESCRIBE order_tracking');
    console.log('\n📋 Order tracking table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n🎉 Tracking table setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up tracking table:', error.message);
    console.error('Error details:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

setupTrackingTable(); 
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function setupTrackingTable() {
  let connection;
  
  try {
    console.log('🔍 Setting up tracking table...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'database', 'tracking_table.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split the SQL content into individual statements
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
        console.log('✅ Executed:', statement.trim().substring(0, 50) + '...');
      }
    }
    
    // Check table structure
    const [columns] = await connection.execute('DESCRIBE order_tracking');
    console.log('\n📋 Order tracking table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n🎉 Tracking table setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up tracking table:', error.message);
    console.error('Error details:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

setupTrackingTable(); 