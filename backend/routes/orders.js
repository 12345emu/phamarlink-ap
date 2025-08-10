const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const { executeQuery, executeTransaction } = require('../config/database');

const router = express.Router();

// Get all orders (filtered by user role)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      date_from, 
      date_to,
      pharmacy_id
    } = req.query;
    
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.user_type;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    // Filter by user role
    if (userRole === 'patient') {
      whereClause += ' AND o.user_id = ?';
      params.push(userId);
    } else if (userRole === 'pharmacist') {
      whereClause += ' AND o.pharmacy_id IN (SELECT id FROM healthcare_facilities WHERE user_id = ?)';
      params.push(userId);
    }
    // Admin can see all orders
    
    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    
    if (date_from) {
      whereClause += ' AND DATE(o.created_at) >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      whereClause += ' AND DATE(o.created_at) <= ?';
      params.push(date_to);
    }
    
    if (pharmacy_id) {
      whereClause += ' AND o.pharmacy_id = ?';
      params.push(pharmacy_id);
    }
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM orders o
      ${whereClause}
    `;
    
    const ordersQuery = `
      SELECT 
        o.*,
        u.first_name, u.last_name, u.email, u.phone,
        hf.name as pharmacy_name, hf.address as pharmacy_address,
        hf.phone as pharmacy_phone, hf.latitude, hf.longitude
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN healthcare_facilities hf ON o.pharmacy_id = hf.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [countResult] = await executeQuery(countQuery, params);
    const orders = await executeQuery(ordersQuery, [...params, parseInt(limit), offset]);
    
    // Get order items for each order
    for (let order of orders) {
      const itemsQuery = `
        SELECT 
          oi.*,
          m.name as medicine_name, m.generic_name, m.dosage_form, m.strength
        FROM order_items oi
        JOIN medicines m ON oi.medicine_id = m.id
        WHERE oi.order_id = ?
      `;
      const [items] = await executeQuery(itemsQuery, [order.id]);
      order.items = items;
    }
    
    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get order by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.user_type;
    
    const orderQuery = `
      SELECT 
        o.*,
        u.first_name, u.last_name, u.email, u.phone,
        hf.name as pharmacy_name, hf.address as pharmacy_address,
        hf.phone as pharmacy_phone, hf.latitude, hf.longitude
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN healthcare_facilities hf ON o.pharmacy_id = hf.id
      WHERE o.id = ?
    `;
    
    const [order] = await executeQuery(orderQuery, [id]);
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    // Check access permissions
    if (userRole === 'patient' && order.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if (userRole === 'pharmacist' && !await checkPharmacyAccess(userId, order.pharmacy_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Get order items
    const itemsQuery = `
      SELECT 
        oi.*,
        m.name as medicine_name, m.generic_name, m.dosage_form, m.strength,
        m.prescription_required
      FROM order_items oi
      JOIN medicines m ON oi.medicine_id = m.id
      WHERE oi.order_id = ?
    `;
    const [items] = await executeQuery(itemsQuery, [id]);
    order.items = items;
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create new order
router.post('/', authenticateToken, requireRole(['patient']), [
  body('pharmacy_id').isInt({ min: 1 }),
  body('items').isArray({ min: 1 }),
  body('items.*.medicine_id').isInt({ min: 1 }),
  body('items.*.quantity').isInt({ min: 1 }),
  body('delivery_address').isLength({ min: 10, max: 200 }).trim(),
  body('delivery_instructions').optional().isLength({ max: 200 }).trim(),
  body('payment_method').isIn(['cash', 'card', 'mobile_money']),
  body('prescription_required').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }
    
    const orderData = req.body;
    const userId = req.user.id;
    
    // Check if pharmacy exists and is active
    const [pharmacy] = await executeQuery(
      'SELECT id, facility_type FROM healthcare_facilities WHERE id = ? AND is_active = true AND facility_type = "pharmacy"',
      [orderData.pharmacy_id]
    );
    
    if (!pharmacy) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    }
    
    // Validate and check stock for each item
    let totalAmount = 0;
    const validatedItems = [];
    
    for (const item of orderData.items) {
      const [medicine] = await executeQuery(
        `SELECT m.*, pm.price, pm.stock_quantity, pm.is_available
         FROM medicines m
         JOIN pharmacy_medicines pm ON m.id = pm.medicine_id
         WHERE m.id = ? AND pm.pharmacy_id = ? AND m.is_active = true`,
        [item.medicine_id, orderData.pharmacy_id]
      );
      
      if (!medicine || medicine.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: `Medicine with ID ${item.medicine_id} not found in this pharmacy` 
        });
      }
      
      const med = medicine[0];
      
      if (!med.is_available) {
        return res.status(400).json({ 
          success: false, 
          message: `Medicine ${med.name} is not available in this pharmacy` 
        });
      }
      
      if (med.stock_quantity < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock for ${med.name}. Available: ${med.stock_quantity}` 
        });
      }
      
      if (med.prescription_required && !orderData.prescription_required) {
        return res.status(400).json({ 
          success: false, 
          message: `Prescription required for ${med.name}` 
        });
      }
      
      totalAmount += med.price * item.quantity;
      validatedItems.push({
        ...item,
        price: med.price,
        medicine_name: med.name
      });
    }
    
    // Create order and order items
    const orderId = await executeTransaction(async (connection) => {
      // Create order
      const orderQuery = `
        INSERT INTO orders (
          user_id, pharmacy_id, total_amount, delivery_address, 
          delivery_instructions, payment_method, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
      `;
      
      const [orderResult] = await connection.execute(orderQuery, [
        userId,
        orderData.pharmacy_id,
        totalAmount,
        orderData.delivery_address,
        orderData.delivery_instructions || null,
        orderData.payment_method
      ]);
      
      const orderId = orderResult.insertId;
      
      // Create order items
      for (const item of validatedItems) {
        const itemQuery = `
          INSERT INTO order_items (
            order_id, medicine_id, quantity, price, created_at
          ) VALUES (?, ?, ?, ?, NOW())
        `;
        
        await connection.execute(itemQuery, [
          orderId,
          item.medicine_id,
          item.quantity,
          item.price
        ]);
        
        // Update stock
        await connection.execute(
          'UPDATE pharmacy_medicines SET stock_quantity = stock_quantity - ? WHERE medicine_id = ? AND pharmacy_id = ?',
          [item.quantity, item.medicine_id, orderData.pharmacy_id]
        );
      }
      
      return orderId;
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Order created successfully',
      data: { 
        id: orderId,
        total_amount: totalAmount,
        items: validatedItems
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update order status (pharmacist/admin only)
router.patch('/:id/status', authenticateToken, requireRole(['pharmacist', 'admin']), [
  body('status').isIn(['confirmed', 'processing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']),
  body('notes').optional().isLength({ max: 200 }).trim(),
  body('estimated_delivery').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error', 
        errors: errors.array() 
      });
    }
    
    const { id } = req.params;
    const { status, notes, estimated_delivery } = req.body;
    const userId = req.user.id;
    
    // Check if order exists and user has access
    const [order] = await executeQuery(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (!await checkPharmacyAccess(userId, order.pharmacy_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Update order status
    const updateQuery = `
      UPDATE orders 
      SET status = ?, notes = ?, estimated_delivery = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [
      status, 
      notes || null, 
      estimated_delivery || null, 
      id
    ]);
    
    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Cancel order (patient only)
router.patch('/:id/cancel', authenticateToken, requireRole(['patient']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if order exists and belongs to user
    const [order] = await executeQuery(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }
    
    if (['delivered', 'out_for_delivery'].includes(order.status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel order that is already out for delivery or delivered' 
      });
    }
    
    // Cancel order and restore stock
    await executeTransaction(async (connection) => {
      // Update order status
      await connection.execute(
        'UPDATE orders SET status = "cancelled", updated_at = NOW() WHERE id = ?',
        [id]
      );
      
      // Restore stock quantities
      const itemsQuery = 'SELECT medicine_id, quantity FROM order_items WHERE order_id = ?';
      const [items] = await connection.execute(itemsQuery, [id]);
      
      for (const item of items) {
        await connection.execute(
          `UPDATE pharmacy_medicines 
           SET stock_quantity = stock_quantity + ? 
           WHERE medicine_id = ? AND pharmacy_id = ?`,
          [item.quantity, item.medicine_id, order.pharmacy_id]
        );
      }
    });
    
    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get order tracking information
router.get('/:id/tracking', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.user_type;
    
    // Check if order exists and user has access
    const [order] = await executeQuery(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (userRole === 'patient' && order.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if (userRole === 'pharmacist' && !await checkPharmacyAccess(userId, order.pharmacy_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Generate tracking timeline based on order status
    const timeline = generateTrackingTimeline(order);
    
    res.json({ 
      success: true, 
      data: { 
        order_id: id,
        current_status: order.status,
        timeline,
        estimated_delivery: order.estimated_delivery
      } 
    });
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Helper function to check pharmacy access
async function checkPharmacyAccess(userId, pharmacyId) {
  const [pharmacy] = await executeQuery(
    'SELECT id FROM healthcare_facilities WHERE id = ? AND user_id = ? AND facility_type = "pharmacy"',
    [pharmacyId, userId]
  );
  return pharmacy.length > 0;
}

// Helper function to generate tracking timeline
function generateTrackingTimeline(order) {
  const timeline = [
    {
      status: 'pending',
      title: 'Order Placed',
      description: 'Your order has been placed and is awaiting confirmation',
      timestamp: order.created_at,
      completed: true
    }
  ];
  
  const statusOrder = ['confirmed', 'processing', 'ready', 'out_for_delivery', 'delivered'];
  const currentIndex = statusOrder.indexOf(order.status);
  
  for (let i = 0; i <= currentIndex; i++) {
    const status = statusOrder[i];
    let title, description;
    
    switch (status) {
      case 'confirmed':
        title = 'Order Confirmed';
        description = 'Your order has been confirmed by the pharmacy';
        break;
      case 'processing':
        title = 'Processing';
        description = 'Your order is being prepared';
        break;
      case 'ready':
        title = 'Ready for Delivery';
        description = 'Your order is ready and will be delivered soon';
        break;
      case 'out_for_delivery':
        title = 'Out for Delivery';
        description = 'Your order is on its way to you';
        break;
      case 'delivered':
        title = 'Delivered';
        description = 'Your order has been delivered successfully';
        break;
    }
    
    if (title) {
      timeline.push({
        status,
        title,
        description,
        timestamp: order.updated_at || order.created_at,
        completed: i <= currentIndex
      });
    }
  }
  
  return timeline;
}

module.exports = router; 