const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function testOrdersSimple() {
  let connection;
  
  try {
    console.log('🔍 Testing orders table...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Check if orders table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "orders"');
    console.log('Orders table exists:', tables.length > 0);
    
    if (tables.length === 0) {
      console.log('❌ Orders table does not exist!');
      return;
    }
    
    // Check orders table structure
    const [ordersColumns] = await connection.execute('DESCRIBE orders');
    console.log('\n📋 Orders table structure:');
    ordersColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    // Check if we have a test user
    const [users] = await connection.execute('SELECT id, email FROM users WHERE email = ?', ['test@pharmalink.com']);
    console.log('\n📋 Test user:', users[0]);
    
    if (users.length === 0) {
      console.log('❌ Test user not found!');
      return;
    }
    
    // Test a simple insert
    console.log('\n🧪 Testing simple insert...');
    const testOrderNumber = `TEST-${Date.now()}`;
    
    const insertResult = await connection.execute(
      `INSERT INTO orders (
        order_number, patient_id, pharmacy_id, total_amount, tax_amount, discount_amount, final_amount,
        delivery_address, payment_method, status, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testOrderNumber,
        users[0].id,
        1, // pharmacy_id
        100.00,
        5.00,
        0.00,
        105.00,
        'Test Address',
        'cash',
        'pending',
        'pending'
      ]
    );
    
    console.log('✅ Insert successful!');
    console.log('Insert ID:', insertResult[0].insertId);
    
    // Clean up
    await connection.execute('DELETE FROM orders WHERE order_number = ?', [testOrderNumber]);
    console.log('✅ Test order cleaned up');
    
    console.log('\n🎉 Orders table test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing orders table:', error.message);
    console.error('Error details:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

testOrdersSimple(); 