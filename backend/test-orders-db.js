const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function testOrdersDB() {
  let connection;
  
  try {
    console.log('🔍 Testing orders database...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Check if orders table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "orders"');
    console.log('Orders table exists:', tables.length > 0);
    
    // Check if order_items table exists
    const [orderItemsTables] = await connection.execute('SHOW TABLES LIKE "order_items"');
    console.log('Order items table exists:', orderItemsTables.length > 0);
    
    // Check orders table structure
    const [ordersColumns] = await connection.execute('DESCRIBE orders');
    console.log('\n📋 Orders table columns:');
    ordersColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    // Check order_items table structure
    const [orderItemsColumns] = await connection.execute('DESCRIBE order_items');
    console.log('\n📋 Order items table columns:');
    orderItemsColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    // Check if we have a user to test with
    const [users] = await connection.execute('SELECT id, email FROM users LIMIT 1');
    console.log('\n📋 Available users:', users);
    
    // Check if we have a pharmacy to test with
    const [pharmacies] = await connection.execute('SELECT id, name FROM healthcare_facilities WHERE facility_type = "pharmacy" LIMIT 1');
    console.log('\n📋 Available pharmacies:', pharmacies);
    
    // Check if we have medicines to test with
    const [medicines] = await connection.execute('SELECT id, name FROM medicines LIMIT 2');
    console.log('\n📋 Available medicines:', medicines);
    
    console.log('\n✅ Database test completed!');
    
  } catch (error) {
    console.error('❌ Error testing database:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

testOrdersDB(); 