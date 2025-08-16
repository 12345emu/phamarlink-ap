const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmalink_db1'
};

async function setupOrdersTables() {
  let connection;
  
  try {
    console.log('🔍 Setting up orders tables...');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Create orders table
    const createOrdersTable = `
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        patient_id INT NOT NULL,
        pharmacy_id INT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        final_amount DECIMAL(10,2) NOT NULL,
        status ENUM('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled') DEFAULT 'pending',
        payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
        payment_method ENUM('cash', 'mobile_money', 'card', 'bank_transfer'),
        delivery_address TEXT,
        delivery_instructions TEXT,
        estimated_delivery DATETIME,
        actual_delivery DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (pharmacy_id) REFERENCES healthcare_facilities(id) ON DELETE CASCADE
      )
    `;
    
    await connection.execute(createOrdersTable);
    console.log('✅ Orders table created/verified');
    
    // Create order_items table
    const createOrderItemsTable = `
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        medicine_id INT NOT NULL,
        pharmacy_medicine_id INT,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
        FOREIGN KEY (pharmacy_medicine_id) REFERENCES pharmacy_medicines(id) ON DELETE SET NULL
      )
    `;
    
    await connection.execute(createOrderItemsTable);
    console.log('✅ Order items table created/verified');
    
    // Check table structure
    const [ordersColumns] = await connection.execute('DESCRIBE orders');
    const [orderItemsColumns] = await connection.execute('DESCRIBE order_items');
    
    console.log('\n📋 Orders table structure:');
    ordersColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    console.log('\n📋 Order items table structure:');
    orderItemsColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    console.log('\n✅ Orders tables setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up orders tables:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

setupOrdersTables(); 