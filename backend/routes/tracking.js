const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { executeQuery } = require('../config/database');

const router = express.Router();

// Generate tracking number
function generateTrackingNumber() {
  const prefix = 'TRK';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

// Get tracking information by order ID
router.get('/order/:orderId', authenticateToken, [
  param('orderId').isInt({ min: 1 })
], async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.user_type;

    // Check if order exists and user has access
    const orderQuery = `
      SELECT o.*, u.id as user_id, u.user_type
      FROM orders o
      JOIN users u ON o.patient_id = u.id
      WHERE o.id = ?
    `;
    
    const orderResult = await executeQuery(orderQuery, [orderId]);
    
    if (!orderResult.success || !orderResult.data || orderResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const order = orderResult.data[0];
    console.log('🔍 Order object from database:', JSON.stringify(order, null, 2));
    
    // Check access permissions
    if (userRole === 'patient' && order.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if (userRole === 'pharmacist') {
      // Check if pharmacist has access to this pharmacy
      const pharmacyAccessQuery = `
        SELECT id FROM healthcare_facilities 
        WHERE id = ? AND user_id = ? AND facility_type = 'pharmacy'
      `;
      const pharmacyResult = await executeQuery(pharmacyAccessQuery, [order.pharmacy_id, userId]);
      if (!pharmacyResult.success || !pharmacyResult.data || pharmacyResult.data.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    // Get tracking information
    const trackingQuery = `
      SELECT * FROM order_tracking 
      WHERE order_id = ? 
      ORDER BY timestamp DESC
    `;
    
    const trackingResult = await executeQuery(trackingQuery, [orderId]);
    
    if (!trackingResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to fetch tracking information' });
    }

    // If no tracking exists, create initial tracking entry
    if (!trackingResult.data || trackingResult.data.length === 0) {
      const trackingNumber = generateTrackingNumber();
      const initialTrackingQuery = `
        INSERT INTO order_tracking (order_id, status, description, tracking_number)
        VALUES (?, ?, ?, ?)
      `;
      
      const initialStatus = order.status || 'pending';
      const initialDescription = getStatusDescription(initialStatus);
      
      const insertResult = await executeQuery(initialTrackingQuery, [
        orderId, 
        initialStatus, 
        initialDescription, 
        trackingNumber
      ]);
      
      if (insertResult.success) {
        // Fetch the newly created tracking entry
        const newTrackingResult = await executeQuery(trackingQuery, [orderId]);
        trackingResult.data = newTrackingResult.success ? newTrackingResult.data : [];
      }
    }

    const responseData = {
      success: true,
      data: {
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          created_at: order.created_at,
          estimated_delivery: order.estimated_delivery,
          delivery_address: order.delivery_address
        },
        tracking: trackingResult.data || [],
        tracking_number: trackingResult.data && trackingResult.data.length > 0 
          ? trackingResult.data[0].tracking_number 
          : null
      }
    };
    
    console.log('🔍 Response data being sent:', JSON.stringify(responseData, null, 2));
    res.json(responseData);

  } catch (error) {
    console.error('Error fetching tracking information:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get tracking information by tracking number
router.get('/number/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    // Get tracking information by tracking number
    const trackingQuery = `
      SELECT ot.*, o.order_number, o.status, o.created_at, o.estimated_delivery, o.delivery_address
      FROM order_tracking ot
      JOIN orders o ON ot.order_id = o.id
      WHERE ot.tracking_number = ?
      ORDER BY ot.timestamp DESC
    `;
    
    const trackingResult = await executeQuery(trackingQuery, [trackingNumber]);
    
    if (!trackingResult.success || !trackingResult.data || trackingResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Tracking information not found' });
    }

    const trackingData = trackingResult.data;
    const orderInfo = {
      order_number: trackingData[0].order_number,
      status: trackingData[0].status,
      created_at: trackingData[0].created_at,
      estimated_delivery: trackingData[0].estimated_delivery,
      delivery_address: trackingData[0].delivery_address
    };

    res.json({
      success: true,
      data: {
        order: orderInfo,
        tracking: trackingData,
        tracking_number: trackingNumber
      }
    });

  } catch (error) {
    console.error('Error fetching tracking by number:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update tracking status (for pharmacists/admin)
router.post('/update/:orderId', authenticateToken, requireRole(['pharmacist', 'admin']), [
  param('orderId').isInt({ min: 1 }),
  body('status').isIn(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']),
  body('description').optional().isString(),
  body('location').optional().isString(),
  body('estimated_delivery').optional().isISO8601(),
  body('actual_delivery').optional().isISO8601()
], async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, description, location, estimated_delivery, actual_delivery } = req.body;
    const userId = req.user.id;

    // Check if order exists and user has access
    const orderQuery = `
      SELECT o.* FROM orders o
      JOIN healthcare_facilities hf ON o.pharmacy_id = hf.id
      WHERE o.id = ? AND hf.user_id = ? AND hf.facility_type = 'pharmacy'
    `;
    
    const orderResult = await executeQuery(orderQuery, [orderId, userId]);
    
    if (!orderResult.success || !orderResult.data || orderResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found or access denied' });
    }

    // Update order status
    const updateOrderQuery = `
      UPDATE orders 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const updateOrderResult = await executeQuery(updateOrderQuery, [status, orderId]);
    
    if (!updateOrderResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to update order status' });
    }

    // Add tracking entry
    const trackingQuery = `
      INSERT INTO order_tracking (order_id, status, description, location, estimated_delivery, actual_delivery)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const trackingResult = await executeQuery(trackingQuery, [
      orderId, 
      status, 
      description || getStatusDescription(status), 
      location, 
      estimated_delivery, 
      actual_delivery
    ]);
    
    if (!trackingResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to add tracking entry' });
    }

    res.json({
      success: true,
      message: 'Tracking updated successfully',
      data: {
        order_id: orderId,
        status,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating tracking:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Helper function to get status descriptions
function getStatusDescription(status) {
  const descriptions = {
    'pending': 'Order has been placed and is awaiting confirmation',
    'confirmed': 'Order has been confirmed and is being processed',
    'preparing': 'Order is being prepared for delivery',
    'ready': 'Order is ready for pickup or delivery',
    'out_for_delivery': 'Order is out for delivery',
    'delivered': 'Order has been successfully delivered',
    'cancelled': 'Order has been cancelled'
  };
  
  return descriptions[status] || 'Status updated';
}

module.exports = router; 