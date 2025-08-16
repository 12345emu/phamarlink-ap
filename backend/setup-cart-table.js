const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

async function setupCartTable() {
  let connection;
  
  try {
    console.log('🔍 Setting up cart table...');
    
    // 1. Connect to database
    console.log('1. Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully!');

    // 2. Read and execute cart table SQL
    console.log('\n2. Creating cart table...');
    const cartTableSQL = fs.readFileSync(path.join(__dirname, 'database/cart_table.sql'), 'utf8');
    
    // Split the SQL file into individual statements
    const statements = cartTableSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✅ Executed SQL statement');
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('ℹ️  Cart table already exists');
          } else {
            console.error('❌ SQL execution error:', error.message);
          }
        }
      }
    }

    // 3. Verify cart table exists
    console.log('\n3. Verifying cart table...');
    const [tables] = await connection.execute('SHOW TABLES LIKE "cart_items"');
    
    if (tables.length > 0) {
      console.log('✅ Cart table exists successfully!');
      
      // Show table structure
      const [columns] = await connection.execute('DESCRIBE cart_items');
      console.log('\n📋 Cart table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } else {
      console.log('❌ Cart table was not created');
    }

  } catch (error) {
    console.error('❌ Setup error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

setupCartTable(); 