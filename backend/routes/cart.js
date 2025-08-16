const express = require('express');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's cart
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const cartQuery = `
      SELECT 
        ci.id,
        ci.quantity,
        ci.price_per_unit,
        m.id as medicine_id,
        m.name as medicine_name,
        m.generic_name,
        m.brand_name,
        m.description as medicine_description,
        m.category,
        m.prescription_required,
        m.dosage_form,
        m.strength,
        m.manufacturer,
        hf.id as pharmacy_id,
        hf.name as pharmacy_name,
        hf.address as pharmacy_address,
        hf.city as pharmacy_city
      FROM cart_items ci
      JOIN medicines m ON ci.medicine_id = m.id
      JOIN healthcare_facilities hf ON ci.pharmacy_id = hf.id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
    `;

    const result = await executeQuery(cartQuery, [userId]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch cart items'
      });
    }

    // Transform the data to match frontend expectations
    const cartItems = result.data.map(item => ({
      id: item.id,
      medicine: {
        id: item.medicine_id,
        name: item.medicine_name,
        genericName: item.generic_name,
        brandName: item.brand_name,
        description: item.medicine_description,
        category: item.category,
        prescriptionRequired: item.prescription_required,
        dosageForm: item.dosage_form,
        strength: item.strength,
        manufacturer: item.manufacturer,
        image: null // No image field in medicines table
      },
      pharmacy: {
        id: item.pharmacy_id,
        name: item.pharmacy_name,
        address: item.pharmacy_address,
        city: item.pharmacy_city
      },
      quantity: item.quantity,
      pricePerUnit: parseFloat(item.price_per_unit),
      totalPrice: parseFloat(item.price_per_unit) * item.quantity
    }));

    res.json({
      success: true,
      data: cartItems
    });

  } catch (error) {
    console.error('❌ Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add item to cart
router.post('/add', authenticateToken, [
  body('medicineId').isInt().notEmpty(),
  body('pharmacyId').isInt().notEmpty(),
  body('quantity').isInt({ min: 1 }).notEmpty(),
  body('pricePerUnit').isFloat({ min: 0 }).notEmpty()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const { medicineId, pharmacyId, quantity, pricePerUnit } = req.body;
    
    console.log('🔍 Adding to cart:', {
      userId,
      medicineId,
      pharmacyId,
      quantity,
      pricePerUnit
    });

    // Check if item already exists in cart
    const existingQuery = 'SELECT id, quantity FROM cart_items WHERE user_id = ? AND medicine_id = ? AND pharmacy_id = ?';
    const existingResult = await executeQuery(existingQuery, [userId, medicineId, pharmacyId]);

    if (!existingResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check existing cart item'
      });
    }

    let result;
    if (existingResult.data.length > 0) {
      // Update existing item quantity
      const newQuantity = existingResult.data[0].quantity + quantity;
      const updateQuery = 'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      result = await executeQuery(updateQuery, [newQuantity, existingResult.data[0].id]);
    } else {
      // Add new item to cart
      const insertQuery = 'INSERT INTO cart_items (user_id, medicine_id, pharmacy_id, quantity, price_per_unit) VALUES (?, ?, ?, ?, ?)';
      result = await executeQuery(insertQuery, [userId, medicineId, pharmacyId, quantity, pricePerUnit]);
    }

    if (!result.success) {
      console.error('❌ Database error adding to cart:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to add item to cart',
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Item added to cart successfully'
    });

  } catch (error) {
    console.error('❌ Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update cart item quantity
router.put('/update/:itemId', authenticateToken, [
  body('quantity').isInt({ min: 1 }).notEmpty()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const itemId = req.params.itemId;
    const { quantity } = req.body;

    // Verify the item belongs to the user
    const verifyQuery = 'SELECT id FROM cart_items WHERE id = ? AND user_id = ?';
    const verifyResult = await executeQuery(verifyQuery, [itemId, userId]);

    if (!verifyResult.success || verifyResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    // Update quantity
    const updateQuery = 'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const result = await executeQuery(updateQuery, [quantity, itemId]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update cart item'
      });
    }

    res.json({
      success: true,
      message: 'Cart item updated successfully'
    });

  } catch (error) {
    console.error('❌ Update cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const itemId = req.params.itemId;

    // Verify the item belongs to the user
    const verifyQuery = 'SELECT id FROM cart_items WHERE id = ? AND user_id = ?';
    const verifyResult = await executeQuery(verifyQuery, [itemId, userId]);

    if (!verifyResult.success || verifyResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    // Remove item
    const deleteQuery = 'DELETE FROM cart_items WHERE id = ?';
    const result = await executeQuery(deleteQuery, [itemId]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to remove cart item'
      });
    }

    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });

  } catch (error) {
    console.error('❌ Remove cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Clear user's cart (used after successful checkout)
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const deleteQuery = 'DELETE FROM cart_items WHERE user_id = ?';
    const result = await executeQuery(deleteQuery, [userId]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to clear cart'
      });
    }

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });

  } catch (error) {
    console.error('❌ Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 