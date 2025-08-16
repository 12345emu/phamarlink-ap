const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function fixOrderItemsTable() {
  let connection;
  
  try {
    console.log('🔍 Fixing order_items table...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Check current table structure
    const [columns] = await connection.execute('DESCRIBE order_items');
    console.log('\n📋 Current order_items table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Modify pharmacy_medicine_id to allow NULL
    console.log('\n🔧 Modifying pharmacy_medicine_id column...');
    await connection.execute('ALTER TABLE order_items MODIFY COLUMN pharmacy_medicine_id INT NULL');
    console.log('✅ pharmacy_medicine_id column modified to allow NULL');
    
    // Check updated table structure
    const [updatedColumns] = await connection.execute('DESCRIBE order_items');
    console.log('\n📋 Updated order_items table structure:');
    updatedColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    console.log('\n🎉 Order items table fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing order_items table:', error.message);
    console.error('Error details:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

fixOrderItemsTable(); 