const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateOrderStatus() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pharmalink_db'
  });

  try {
    console.log('🔍 Updating order status...\n');

    const orderId = 6; // Order to update
    const newStatus = 'confirmed';

    // Update the order status
    console.log(`📝 Updating order ${orderId} status to '${newStatus}'...`);
    const [updateResult] = await connection.execute(
      'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, orderId]
    );

    console.log(`✅ Order status updated. Rows affected: ${updateResult.affectedRows}`);

    // Add a tracking entry for the status change
    console.log(`📝 Adding tracking entry for status change...`);
    const [trackingResult] = await connection.execute(
      'INSERT INTO order_tracking (order_id, status, description) VALUES (?, ?, ?)',
      [orderId, newStatus, 'Order has been confirmed and is being processed']
    );

    console.log(`✅ Tracking entry added. Insert ID: ${trackingResult.insertId}`);

    // Verify the update
    console.log('\n🔍 Verifying the update...');
    const [orders] = await connection.execute(
      'SELECT id, order_number, status FROM orders WHERE id = ?',
      [orderId]
    );
    console.table(orders);

    // Check tracking entries
    console.log('\n📋 Tracking entries for this order:');
    const [tracking] = await connection.execute(
      'SELECT order_id, status, description, timestamp FROM order_tracking WHERE order_id = ? ORDER BY timestamp DESC',
      [orderId]
    );
    console.table(tracking);

    console.log('\n✅ Status update completed successfully!');
    console.log('🎯 Now test the tracking timeline in the app to see if it shows the confirmed status.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

updateOrderStatus();
