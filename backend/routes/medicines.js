const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const { executeQuery, executeTransaction } = require('../config/database');

const router = express.Router();

// Get all medicines with search and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      prescription_required,
      min_price,
      max_price,
      sort_by = 'name',
      sort_order = 'ASC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE m.is_active = true';
    let params = [];
    
    if (search) {
      whereClause += ' AND (m.name LIKE ? OR m.generic_name LIKE ? OR m.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (category) {
      whereClause += ' AND m.category = ?';
      params.push(category);
    }
    
    if (prescription_required !== undefined) {
      whereClause += ' AND m.prescription_required = ?';
      params.push(prescription_required === 'true');
    }
    
    if (min_price) {
      whereClause += ' AND pm.price >= ?';
      params.push(parseFloat(min_price));
    }
    
    if (max_price) {
      whereClause += ' AND pm.price <= ?';
      params.push(parseFloat(max_price));
    }
    
    // Validate sort parameters
    const allowedSortFields = ['name', 'price', 'created_at', 'popularity'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    if (!allowedSortFields.includes(sort_by)) sort_by = 'name';
    if (!allowedSortOrders.includes(sort_order.toUpperCase())) sort_order = 'ASC';
    
    const countQuery = `
      SELECT COUNT(DISTINCT m.id) as total 
      FROM medicines m
      LEFT JOIN pharmacy_medicines pm ON m.id = pm.medicine_id
      ${whereClause}
    `;
    
    const medicinesQuery = `
      SELECT 
        m.id, m.name, m.generic_name, m.description, m.category,
        m.prescription_required, m.dosage_form, m.strength,
        m.manufacturer, m.created_at,
        MIN(pm.price) as min_price,
        MAX(pm.price) as max_price,
        COUNT(DISTINCT pm.pharmacy_id) as available_pharmacies,
        AVG(pm.stock_quantity) as avg_stock
      FROM medicines m
      LEFT JOIN pharmacy_medicines pm ON m.id = pm.medicine_id
      ${whereClause}
      GROUP BY m.id
      ORDER BY ${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;
    
    const [countResult] = await executeQuery(countQuery, params);
    const medicines = await executeQuery(medicinesQuery, [...params, parseInt(limit), offset]);
    
    res.json({
      success: true,
      data: {
        medicines,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get medicine by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const medicineQuery = `
      SELECT 
        m.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'pharmacy_id', pm.pharmacy_id,
            'pharmacy_name', hf.name,
            'price', pm.price,
            'stock_quantity', pm.stock_quantity,
            'is_available', pm.is_available,
            'expiry_date', pm.expiry_date
          )
        ) as pharmacy_availability
      FROM medicines m
      LEFT JOIN pharmacy_medicines pm ON m.id = pm.medicine_id
      LEFT JOIN healthcare_facilities hf ON pm.pharmacy_id = hf.id
      WHERE m.id = ? AND m.is_active = true
      GROUP BY m.id
    `;
    
    const [medicine] = await executeQuery(medicineQuery, [id]);
    
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    
    // Parse JSON array
    if (medicine.pharmacy_availability) {
      try {
        medicine.pharmacy_availability = JSON.parse(medicine.pharmacy_availability);
      } catch (e) {
        medicine.pharmacy_availability = [];
      }
    }
    
    res.json({ success: true, data: medicine });
  } catch (error) {
    console.error('Error fetching medicine:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Add new medicine (admin/pharmacist only)
router.post('/', authenticateToken, requireRole(['admin', 'pharmacist']), [
  body('name').isLength({ min: 2, max: 100 }).trim(),
  body('generic_name').optional().isLength({ min: 2, max: 100 }).trim(),
  body('description').optional().isLength({ max: 500 }).trim(),
  body('category').isIn(['antibiotics', 'painkillers', 'vitamins', 'diabetes', 'heart', 'respiratory', 'other']),
  body('prescription_required').isBoolean(),
  body('dosage_form').isIn(['tablet', 'capsule', 'liquid', 'injection', 'cream', 'inhaler', 'other']),
  body('strength').optional().isLength({ max: 50 }).trim(),
  body('manufacturer').optional().isLength({ max: 100 }).trim(),
  body('side_effects').optional().isArray(),
  body('interactions').optional().isArray(),
  body('storage_instructions').optional().isLength({ max: 200 }).trim()
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
    
    const medicineData = req.body;
    
    const insertQuery = `
      INSERT INTO medicines (
        name, generic_name, description, category, prescription_required,
        dosage_form, strength, manufacturer, side_effects, interactions,
        storage_instructions, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const [result] = await executeQuery(insertQuery, [
      medicineData.name,
      medicineData.generic_name || null,
      medicineData.description || null,
      medicineData.category,
      medicineData.prescription_required,
      medicineData.dosage_form,
      medicineData.strength || null,
      medicineData.manufacturer || null,
      JSON.stringify(medicineData.side_effects || []),
      JSON.stringify(medicineData.interactions || []),
      medicineData.storage_instructions || null
    ]);
    
    res.status(201).json({ 
      success: true, 
      message: 'Medicine added successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error adding medicine:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update medicine (admin/pharmacist only)
router.put('/:id', authenticateToken, requireRole(['admin', 'pharmacist']), [
  body('name').optional().isLength({ min: 2, max: 100 }).trim(),
  body('generic_name').optional().isLength({ min: 2, max: 100 }).trim(),
  body('description').optional().isLength({ max: 500 }).trim(),
  body('category').optional().isIn(['antibiotics', 'painkillers', 'vitamins', 'diabetes', 'heart', 'respiratory', 'other']),
  body('prescription_required').optional().isBoolean(),
  body('dosage_form').optional().isIn(['tablet', 'capsule', 'liquid', 'injection', 'cream', 'inhaler', 'other']),
  body('strength').optional().isLength({ max: 50 }).trim(),
  body('manufacturer').optional().isLength({ max: 100 }).trim(),
  body('side_effects').optional().isArray(),
  body('interactions').optional().isArray(),
  body('storage_instructions').optional().isLength({ max: 200 }).trim()
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
    const updateData = req.body;
    
    // Check if medicine exists
    const [existing] = await executeQuery('SELECT id FROM medicines WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    
    const fields = Object.keys(updateData).filter(key => updateData[key] !== undefined);
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    
    const updateQuery = `
      UPDATE medicines 
      SET ${fields.map(field => `${field} = ?`).join(', ')}, updated_at = NOW()
      WHERE id = ?
    `;
    
    const values = fields.map(field => {
      if (Array.isArray(updateData[field])) {
        return JSON.stringify(updateData[field]);
      }
      return updateData[field];
    });
    
    await executeQuery(updateQuery, [...values, id]);
    
    res.json({ success: true, message: 'Medicine updated successfully' });
  } catch (error) {
    console.error('Error updating medicine:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete medicine (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if medicine exists
    const [existing] = await executeQuery('SELECT id FROM medicines WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    
    // Soft delete
    await executeQuery('UPDATE medicines SET is_active = false, updated_at = NOW() WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Medicine deleted successfully' });
  } catch (error) {
    console.error('Error deleting medicine:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get medicine categories
router.get('/categories/list', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT category, COUNT(*) as count
      FROM medicines 
      WHERE is_active = true 
      GROUP BY category 
      ORDER BY count DESC
    `;
    
    const categories = await executeQuery(query);
    
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get medicines with pharmacy availability for home page
router.get('/home/available', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    console.log('🔍 Fetching available medicines with limit:', limit);
    
    const query = `
      SELECT 
        m.id, m.name, m.generic_name, m.category, m.prescription_required,
        m.dosage_form, m.strength, m.description,
        MIN(pm.price) as min_price,
        MAX(pm.price) as max_price,
        COUNT(DISTINCT pm.pharmacy_id) as available_pharmacies,
        AVG(pm.stock_quantity) as avg_stock,
        GROUP_CONCAT(DISTINCT f.name) as pharmacy_names
      FROM medicines m
      INNER JOIN pharmacy_medicines pm ON m.id = pm.medicine_id
      INNER JOIN healthcare_facilities f ON pm.pharmacy_id = f.id
      WHERE m.is_active = true 
      AND pm.is_available = true 
      AND pm.stock_quantity > 0
      AND f.is_active = true
      GROUP BY m.id
      ORDER BY available_pharmacies DESC, avg_stock DESC
      LIMIT ?
    `;
    
    const result = await executeQuery(query, [parseInt(limit)]);
    
    console.log('🔍 Raw medicines result:', result);
    
    if (!result.success) {
      console.error('❌ Query failed:', result.error);
      return res.status(500).json({ success: false, message: 'Database query failed' });
    }
    
    const medicines = result.data;
    console.log('🔍 Medicines data:', medicines);
    console.log('🔍 Medicines type:', typeof medicines);
    console.log('🔍 Is array:', Array.isArray(medicines));
    console.log('🔍 Medicines length:', medicines.length);
    
    res.json({ 
      success: true, 
      data: {
        medicines: medicines.map(medicine => ({
          ...medicine,
          pharmacy_names: medicine.pharmacy_names ? medicine.pharmacy_names.split(',') : []
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching available medicines:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Search medicines by symptoms (basic implementation)
router.get('/search/by-symptoms', async (req, res) => {
  try {
    const { symptoms } = req.query;
    
    if (!symptoms) {
      return res.status(400).json({ 
        success: false, 
        message: 'Symptoms parameter is required' 
      });
    }
    
    // This is a basic implementation - in a real app, you'd have a symptom-medicine mapping table
    const symptomKeywords = symptoms.toLowerCase().split(',').map(s => s.trim());
    
    const query = `
      SELECT DISTINCT m.*
      FROM medicines m
      WHERE m.is_active = true 
      AND (
        m.description LIKE ? 
        OR m.name LIKE ?
        OR m.generic_name LIKE ?
      )
      LIMIT 20
    `;
    
    const searchTerms = symptomKeywords.map(symptom => `%${symptom}%`);
    const medicines = await executeQuery(query, [...searchTerms, ...searchTerms, ...searchTerms]);
    
    res.json({ success: true, data: medicines });
  } catch (error) {
    console.error('Error searching by symptoms:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router; 