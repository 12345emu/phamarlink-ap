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
        pm.price as price_per_unit,
        pm.discount_price,
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
      JOIN pharmacy_medicines pm ON ci.pharmacy_medicine_id = pm.id
      JOIN medicines m ON pm.medicine_id = m.id
      JOIN healthcare_facilities hf ON pm.pharmacy_id = hf.id
      WHERE ci.user_id = ?
      ORDER BY ci.added_at DESC
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
      discountPrice: item.discount_price ? parseFloat(item.discount_price) : null,
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
    const { quantity } = req.body;
    
    console.log('🔍 Adding to cart request body:', req.body);
    
    let pharmacyMedicineId;
    
    // Handle both old and new API formats
    if (req.body.pharmacyMedicineId) {
      // New format: direct pharmacy_medicine_id
      pharmacyMedicineId = req.body.pharmacyMedicineId;
    } else if (req.body.medicineId && req.body.pharmacyId) {
      // Old format: find pharmacy_medicine_id from medicine_id and pharmacy_id
      const findQuery = `
        SELECT pm.id 
        FROM pharmacy_medicines pm 
        WHERE pm.medicine_id = ? AND pm.pharmacy_id = ? AND pm.is_available = TRUE
      `;
      
      const findResult = await executeQuery(findQuery, [req.body.medicineId, req.body.pharmacyId]);
      
      if (!findResult.success || findResult.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Medicine not available at this pharmacy'
        });
      }
      
      pharmacyMedicineId = findResult.data[0].id;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either pharmacyMedicineId or both medicineId and pharmacyId are required'
      });
    }
    
    console.log('🔍 Adding to cart:', {
      userId,
      pharmacyMedicineId,
      quantity,
      originalRequest: req.body
    });

    // Verify the pharmacy_medicine exists and is available
    const verifyQuery = `
      SELECT pm.id, pm.stock_quantity, pm.price, pm.is_available,
             m.name as medicine_name, hf.name as pharmacy_name
      FROM pharmacy_medicines pm
      JOIN medicines m ON pm.medicine_id = m.id
      JOIN healthcare_facilities hf ON pm.pharmacy_id = hf.id
      WHERE pm.id = ? AND pm.is_available = TRUE
    `;
    
    const verifyResult = await executeQuery(verifyQuery, [pharmacyMedicineId]);
    
    if (!verifyResult.success || verifyResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not available at this pharmacy'
      });
    }
    
    const pharmacyMedicine = verifyResult.data[0];
    
    // Check stock availability
    if (pharmacyMedicine.stock_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${pharmacyMedicine.stock_quantity} units available in stock`
      });
    }

    // Check if item already exists in cart
    const existingQuery = 'SELECT id, quantity FROM cart_items WHERE user_id = ? AND pharmacy_medicine_id = ?';
    const existingResult = await executeQuery(existingQuery, [userId, pharmacyMedicineId]);

    if (!existingResult.success) {
      console.error('❌ Database error checking existing cart item:', existingResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check existing cart item',
        error: existingResult.error
      });
    }

    let result;
    if (existingResult.data.length > 0) {
      // Update existing item quantity
      const newQuantity = existingResult.data[0].quantity + quantity;
      
      // Check if new total quantity exceeds stock
      if (pharmacyMedicine.stock_quantity < newQuantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add ${quantity} more units. Only ${pharmacyMedicine.stock_quantity} total units available in stock`
        });
      }
      
      const updateQuery = 'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      result = await executeQuery(updateQuery, [newQuantity, existingResult.data[0].id]);
    } else {
      // Add new item to cart
      const insertQuery = 'INSERT INTO cart_items (user_id, pharmacy_medicine_id, quantity) VALUES (?, ?, ?)';
      result = await executeQuery(insertQuery, [userId, pharmacyMedicineId, quantity]);
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
      message: `${pharmacyMedicine.medicine_name} added to cart successfully from ${pharmacyMedicine.pharmacy_name}`
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