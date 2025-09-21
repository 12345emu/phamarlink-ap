const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for prescription image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/prescriptions');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'prescription-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  }
});

// Get user's prescriptions
router.get('/', authenticateToken, [
  query('search').optional().isLength({ min: 1, max: 100 }).trim(),
  query('doctor_id').optional().isInt({ min: 1 }),
  query('facility_id').optional().isInt({ min: 1 }),
  query('date_from').optional().isISO8601(),
  query('date_to').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
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
    const { search, doctor_id, facility_id, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Build query
    let whereClause = 'WHERE a.user_id = ?';
    const params = [userId];

    if (search) {
      whereClause += ' AND (a.notes LIKE ? OR a.symptoms LIKE ? OR d.first_name LIKE ? OR d.last_name LIKE ? OR f.name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (doctor_id) {
      whereClause += ' AND a.preferred_doctor = ?';
      params.push(doctor_id);
    }

    if (facility_id) {
      whereClause += ' AND a.facility_id = ?';
      params.push(facility_id);
    }

    if (date_from) {
      whereClause += ' AND DATE(a.appointment_date) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND DATE(a.appointment_date) <= ?';
      params.push(date_to);
    }

    const query = `
      SELECT 
        a.id,
        a.id as appointment_id,
        a.user_id as patient_id,
        a.preferred_doctor as doctor_id,
        CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, '')) as doctor_name,
        a.facility_id,
        f.name as facility_name,
        a.appointment_date,
        a.notes as prescription_text,
        a.symptoms as diagnosis,
        a.notes,
        a.created_at,
        a.updated_at
      FROM appointments a
      LEFT JOIN users d ON a.preferred_doctor = d.id
      JOIN healthcare_facilities f ON a.facility_id = f.id
      ${whereClause}
      AND a.notes IS NOT NULL
      AND a.notes != ''
      ORDER BY a.appointment_date DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);

    const result = await executeQuery(query, params);

    if (!result.success) {
      console.error('❌ Backend - Failed to fetch prescriptions:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch prescriptions',
        error: result.error
      });
    }

    // Get prescription medicines for each prescription
    const prescriptions = await Promise.all(
      result.data.map(async (prescription) => {
        const medicinesQuery = `
          SELECT 
            pm.id,
            pm.medicine_id,
            m.name as medicine_name,
            m.generic_name,
            pm.dosage,
            pm.frequency,
            pm.duration,
            pm.instructions,
            pm.quantity
          FROM prescription_medicines pm
          JOIN medicines m ON pm.medicine_id = m.id
          WHERE pm.prescription_id = ?
        `;

        const medicinesResult = await executeQuery(medicinesQuery, [prescription.id]);
        prescription.medicines = medicinesResult.success ? medicinesResult.data : [];

        return prescription;
      })
    );

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM appointments a
      LEFT JOIN users d ON a.preferred_doctor = d.id
      JOIN healthcare_facilities f ON a.facility_id = f.id
      ${whereClause}
      AND a.notes IS NOT NULL
      AND a.notes != ''
    `;

    const countResult = await executeQuery(countQuery, params.slice(0, -2)); // Remove limit and offset
    const total = countResult.success ? countResult.data[0].total : 0;

    res.json({
      success: true,
      data: prescriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Backend - Get prescriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get prescription by ID
router.get('/:id', authenticateToken, [
  param('id').isInt({ min: 1 })
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

    const prescriptionId = req.params.id;
    const userId = req.user.id;

    const query = `
      SELECT 
        a.id,
        a.id as appointment_id,
        a.user_id as patient_id,
        a.preferred_doctor as doctor_id,
        CONCAT(COALESCE(d.first_name, ''), ' ', COALESCE(d.last_name, '')) as doctor_name,
        a.facility_id,
        f.name as facility_name,
        a.appointment_date,
        a.notes as prescription_text,
        a.symptoms as diagnosis,
        a.notes,
        a.created_at,
        a.updated_at
      FROM appointments a
      LEFT JOIN users d ON a.preferred_doctor = d.id
      JOIN healthcare_facilities f ON a.facility_id = f.id
      WHERE a.id = ? AND a.user_id = ?
      AND a.notes IS NOT NULL
      AND a.notes != ''
    `;

    const result = await executeQuery(query, [prescriptionId, userId]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch prescription',
        error: result.error
      });
    }

    if (result.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    const prescription = result.data[0];

    // Get prescription medicines
    const medicinesQuery = `
      SELECT 
        pm.id,
        pm.medicine_id,
        m.name as medicine_name,
        m.generic_name,
        pm.dosage,
        pm.frequency,
        pm.duration,
        pm.instructions,
        pm.quantity
      FROM prescription_medicines pm
      JOIN medicines m ON pm.medicine_id = m.id
      WHERE pm.prescription_id = ?
    `;

    const medicinesResult = await executeQuery(medicinesQuery, [prescription.id]);
    prescription.medicines = medicinesResult.success ? medicinesResult.data : [];

    res.json({
      success: true,
      data: prescription
    });

  } catch (error) {
    console.error('❌ Backend - Get prescription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Upload prescription image
router.post('/upload', authenticateToken, upload.single('prescription_image'), [
  body('description').optional().isLength({ max: 500 }).trim()
], async (req, res) => {
  try {
    console.log('🔍 Upload route called');
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Request file:', req.file);
    console.log('🔍 Request headers:', req.headers);
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      console.log('❌ No file received in request');
      console.log('🔍 Available files:', Object.keys(req.files || {}));
      return res.status(400).json({
        success: false,
        message: 'No prescription image uploaded'
      });
    }

    const userId = req.user.id;
    const { description } = req.body;
    const imagePath = `/uploads/prescriptions/${req.file.filename}`;

    // Create a record for the uploaded prescription
    const insertQuery = `
      INSERT INTO prescription_uploads (
        user_id, 
        image_path, 
        description, 
        status,
        created_at
      ) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `;

    const result = await executeQuery(insertQuery, [userId, imagePath, description || null]);

    if (!result.success) {
      // Delete uploaded file if database insert fails
      fs.unlinkSync(req.file.path);
      return res.status(500).json({
        success: false,
        message: 'Failed to save prescription record',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        prescription_id: result.data.insertId,
        image_path: imagePath,
        message: 'Prescription uploaded successfully'
      }
    });

  } catch (error) {
    console.error('❌ Backend - Upload prescription error:', error);
    
    // Delete uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload prescription',
      error: error.message
    });
  }
});

// Get prescription medicines
router.get('/:id/medicines', authenticateToken, [
  param('id').isInt({ min: 1 })
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

    const prescriptionId = req.params.id;
    const userId = req.user.id;

    // Verify prescription belongs to user
    const verifyQuery = `
      SELECT id FROM appointments 
      WHERE id = ? AND user_id = ?
    `;

    const verifyResult = await executeQuery(verifyQuery, [prescriptionId, userId]);

    if (!verifyResult.success || verifyResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }

    const medicinesQuery = `
      SELECT 
        pm.id,
        pm.medicine_id,
        m.name as medicine_name,
        m.generic_name,
        pm.dosage,
        pm.frequency,
        pm.duration,
        pm.instructions,
        pm.quantity
      FROM prescription_medicines pm
      JOIN medicines m ON pm.medicine_id = m.id
      WHERE pm.prescription_id = ?
    `;

    const result = await executeQuery(medicinesQuery, [prescriptionId]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch prescription medicines',
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('❌ Backend - Get prescription medicines error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
