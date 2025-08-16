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
      whereClause += ' AND o.patient_id = ?';
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
       JOIN users u ON o.patient_id = u.id
       JOIN healthcare_facilities hf ON o.pharmacy_id = hf.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?
     `;
    
         const countResult = await executeQuery(countQuery, params);
     const ordersResult = await executeQuery(ordersQuery, [...params, parseInt(limit), offset]);
     
     if (!countResult.success || !ordersResult.success) {
       return res.status(500).json({ success: false, message: 'Failed to fetch orders' });
     }
     
     const orders = ordersResult.data;
    
         // Get order items for each order and structure pharmacy data
     for (let order of orders) {
       // Structure pharmacy data
       order.pharmacy = {
         id: order.pharmacy_id,
         name: order.pharmacy_name,
         address: order.pharmacy_address,
         phone: order.pharmacy_phone,
         latitude: order.latitude,
         longitude: order.longitude
       };
       
       // Remove individual pharmacy fields to avoid duplication
       delete order.pharmacy_name;
       delete order.pharmacy_address;
       delete order.pharmacy_phone;
       delete order.latitude;
       delete order.longitude;
       
       const itemsQuery = `
         SELECT 
           oi.*,
           m.name as medicine_name, m.generic_name, m.dosage_form, m.strength
         FROM order_items oi
         JOIN medicines m ON oi.medicine_id = m.id
         WHERE oi.order_id = ?
       `;
       const itemsResult = await executeQuery(itemsQuery, [order.id]);
       order.items = itemsResult.success ? itemsResult.data : [];
     }
    
         res.json({
       success: true,
       data: {
         orders,
         pagination: {
           page: parseInt(page),
           limit: parseInt(limit),
           total: countResult.data[0].total,
           pages: Math.ceil(countResult.data[0].total / limit)
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
       JOIN users u ON o.patient_id = u.id
       JOIN healthcare_facilities hf ON o.pharmacy_id = hf.id
       WHERE o.id = ?
     `;
    
         const orderResult = await executeQuery(orderQuery, [id]);
     
     if (!orderResult.success || !orderResult.data || orderResult.data.length === 0) {
       return res.status(404).json({ success: false, message: 'Order not found' });
     }
     
     const order = orderResult.data[0];
    
     // Structure pharmacy data
     order.pharmacy = {
       id: order.pharmacy_id,
       name: order.pharmacy_name,
       address: order.pharmacy_address,
       phone: order.pharmacy_phone,
       latitude: order.latitude,
       longitude: order.longitude
     };
     
     // Remove individual pharmacy fields to avoid duplication
     delete order.pharmacy_name;
     delete order.pharmacy_address;
     delete order.pharmacy_phone;
     delete order.latitude;
     delete order.longitude;
    
         // Check access permissions
     if (userRole === 'patient' && order.patient_id !== userId) {
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
     const itemsResult = await executeQuery(itemsQuery, [id]);
     order.items = itemsResult.success ? itemsResult.data : [];
    
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create new order
router.post('/', authenticateToken, requireRole(['patient']), [
  body('pharmacyId').isInt({ min: 1 }),
  body('items').isArray({ min: 1 }),
  body('items.*.medicineId').isInt({ min: 1 }),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unitPrice').isFloat({ min: 0 }),
  body('items.*.totalPrice').isFloat({ min: 0 }),
  body('deliveryAddress').isLength({ min: 10, max: 200 }).trim(),
  body('deliveryInstructions').optional().isLength({ max: 200 }).trim(),
  body('paymentMethod').isIn(['cash', 'card', 'mobile_money']),
  body('totalAmount').isFloat({ min: 0 }),
  body('taxAmount').isFloat({ min: 0 }),
  body('discountAmount').isFloat({ min: 0 }),
  body('finalAmount').isFloat({ min: 0 })
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
    const pharmacyResult = await executeQuery(
      'SELECT id, facility_type FROM healthcare_facilities WHERE id = ? AND is_active = true AND facility_type = "pharmacy"',
      [orderData.pharmacyId]
    );
    
    if (!pharmacyResult.success || !pharmacyResult.data || pharmacyResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Pharmacy not found' });
    }
    
    const pharmacy = pharmacyResult.data[0];
    
    // Validate medicines exist
    const validatedItems = [];
    
    for (const item of orderData.items) {
      const medicineResult = await executeQuery(
        `SELECT m.*, pm.id as pharmacy_medicine_id, pm.price, pm.stock_quantity, pm.is_available
         FROM medicines m
         LEFT JOIN pharmacy_medicines pm ON m.id = pm.medicine_id AND pm.pharmacy_id = ?
         WHERE m.id = ? AND m.is_active = true`,
        [orderData.pharmacyId, item.medicineId]
      );
      
      if (!medicineResult.success || !medicineResult.data || medicineResult.data.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: `Medicine with ID ${item.medicineId} not found` 
        });
      }
      
      const med = medicineResult.data[0];
      
      // For now, we'll allow orders even if medicine is not in pharmacy_medicines
      // This is because we're using a simplified cart system
      validatedItems.push({
        ...item,
        pharmacy_medicine_id: med.pharmacy_medicine_id || null,
        medicine_name: med.name
      });
    }
    
    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create order and order items using regular queries (simplified for now)
    const orderQuery = `
      INSERT INTO orders (
        order_number, patient_id, pharmacy_id, total_amount, tax_amount, discount_amount, final_amount,
        delivery_address, delivery_instructions, payment_method, status, payment_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', NOW())
    `;
    
    const orderResult = await executeQuery(orderQuery, [
      orderNumber,
      userId,
      orderData.pharmacyId,
      orderData.totalAmount,
      orderData.taxAmount,
      orderData.discountAmount,
      orderData.finalAmount,
      orderData.deliveryAddress,
      orderData.deliveryInstructions || null,
      orderData.paymentMethod
    ]);
    
    if (!orderResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create order' 
      });
    }
    
    const orderId = orderResult.data.insertId;
    
          // Create order items
      for (const item of validatedItems) {
        const itemQuery = `
          INSERT INTO order_items (
            order_id, medicine_id, pharmacy_medicine_id, quantity, unit_price, total_price, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const itemResult = await executeQuery(itemQuery, [
          orderId,
          item.medicineId,
          item.pharmacy_medicine_id || null,
          item.quantity,
          item.unitPrice,
          item.totalPrice
        ]);
        
        if (!itemResult.success) {
          console.error('Failed to create order item:', itemResult.error);
          // Continue with other items even if one fails
        }
      }
    
    res.status(201).json({ 
      success: true, 
      message: 'Order created successfully',
      data: { 
        id: orderId,
        orderNumber,
        totalAmount: orderData.totalAmount,
        finalAmount: orderData.finalAmount,
        items: validatedItems
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
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
    const orderResult = await executeQuery(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    if (!orderResult.success || !orderResult.data || orderResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const order = orderResult.data[0];
    
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
     const orderResult = await executeQuery(
       'SELECT * FROM orders WHERE id = ? AND patient_id = ?',
       [id, userId]
     );
     
     if (!orderResult.success || !orderResult.data || orderResult.data.length === 0) {
       return res.status(404).json({ success: false, message: 'Order not found' });
     }
     
     const order = orderResult.data[0];
    
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
    const orderResult = await executeQuery(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    if (!orderResult.success || !orderResult.data || orderResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const order = orderResult.data[0];
    
         if (userRole === 'patient' && order.patient_id !== userId) {
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
  const pharmacyResult = await executeQuery(
    'SELECT id FROM healthcare_facilities WHERE id = ? AND user_id = ? AND facility_type = "pharmacy"',
    [pharmacyId, userId]
  );
  return pharmacyResult.success && pharmacyResult.data && pharmacyResult.data.length > 0;
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