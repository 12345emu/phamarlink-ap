const { executeQuery } = require('./config/database');

async function fixTrackingTable() {
  console.log('🔧 Fixing order_tracking table structure...');
  
  try {
    // Check current table structure
    const currentStructure = await executeQuery('DESCRIBE order_tracking');
    console.log('📋 Current table structure:', currentStructure.data.map(col => col.Field));
    
    // Add missing columns
    const missingColumns = [
      { name: 'description', type: 'TEXT' },
      { name: 'tracking_number', type: 'VARCHAR(50) UNIQUE' },
      { name: 'timestamp', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
      { name: 'estimated_delivery', type: 'DATETIME' },
      { name: 'actual_delivery', type: 'DATETIME' }
    ];
    
    for (const column of missingColumns) {
      try {
        console.log(`📝 Adding column: ${column.name}`);
        await executeQuery(`ALTER TABLE order_tracking ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ Column ${column.name} added successfully`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`✅ Column ${column.name} already exists`);
        } else {
          console.log(`⚠️ Error adding ${column.name}:`, error.message);
        }
      }
    }
    
    // Verify the updated structure
    const updatedStructure = await executeQuery('DESCRIBE order_tracking');
    console.log('\n📋 Updated table structure:', updatedStructure.data.map(col => col.Field));
    
    // Check if there are any existing tracking entries
    const existingTracking = await executeQuery('SELECT COUNT(*) as count FROM order_tracking');
    console.log(`📊 Existing tracking entries: ${existingTracking.data[0].count}`);
    
    // Create a sample tracking entry for the existing order
    if (existingTracking.data[0].count === 0) {
      console.log('\n📝 Creating sample tracking entry for order ID 1...');
      
      const sampleTrackingQuery = `
        INSERT INTO order_tracking (
          order_id, status, description, tracking_number, 
          location, notes, estimated_delivery
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const trackingNumber = 'TRK' + Date.now().toString().slice(-8) + 'ABC';
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 3); // 3 days from now
      
      const insertResult = await executeQuery(sampleTrackingQuery, [
        1, // order_id
        'pending',
        'Order has been placed and is awaiting confirmation',
        trackingNumber,
        'Pharmacy Warehouse',
        'Order received and being processed',
        estimatedDelivery.toISOString().slice(0, 19).replace('T', ' ')
      ]);
      
      if (insertResult.success) {
        console.log('✅ Sample tracking entry created successfully');
        console.log(`📋 Tracking number: ${trackingNumber}`);
      } else {
        console.log('❌ Failed to create sample tracking entry:', insertResult.error);
      }
    }
    
    // Test the tracking query
    console.log('\n🧪 Testing tracking query...');
    const testQuery = `
      SELECT * FROM order_tracking 
      WHERE order_id = 1 
      ORDER BY timestamp DESC
    `;
    
    const testResult = await executeQuery(testQuery);
    
    if (testResult.success && testResult.data.length > 0) {
      console.log('✅ Tracking query works correctly');
      const tracking = testResult.data[0];
      console.log('📋 Sample tracking data:', {
        id: tracking.id,
        order_id: tracking.order_id,
        status: tracking.status,
        tracking_number: tracking.tracking_number,
        description: tracking.description
      });
    } else {
      console.log('❌ Tracking query failed or no data found');
    }
    
    console.log('\n🎉 Order tracking table fix completed!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixTrackingTable();









