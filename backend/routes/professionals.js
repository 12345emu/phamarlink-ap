const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/professionals');
    console.log('🔍 Upload directory:', uploadDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('✅ Created upload directory:', uploadDir);
      } catch (error) {
        console.error('❌ Error creating upload directory:', error);
        return cb(error);
      }
    }
    
    console.log('✅ Using upload directory:', uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'profile-' + uniqueSuffix + path.extname(file.originalname);
    console.log('🔍 Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    console.log('🔍 File filter - checking file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });
    
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      console.log('✅ File type accepted:', file.mimetype);
      cb(null, true);
    } else {
      console.log('❌ File type rejected:', file.mimetype);
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all healthcare professionals
router.get('/', async (req, res) => {
  try {
    console.log('🔍 GET /professionals route hit');
    
    const { 
      page = 1, 
      limit = 20, 
      search, 
      specialty, 
      is_available,
      sort_by = 'rating',
      sort_order = 'DESC'
    } = req.query;
    
    console.log('📝 Query parameters:', { page, limit, search, specialty, is_available, sort_by, sort_order });
    
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE is_verified = true';
    let params = [];
    
    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR specialty LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (specialty) {
      whereClause += ' AND specialty = ?';
      params.push(specialty);
    }
    
    if (is_available !== undefined) {
      whereClause += ' AND is_available = ?';
      params.push(is_available === 'true');
    }
    
    // Validate sort parameters
    const allowedSortFields = ['rating', 'experience_years', 'first_name', 'created_at'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    if (!allowedSortFields.includes(sort_by)) sort_by = 'rating';
    if (!allowedSortOrders.includes(sort_order.toUpperCase())) sort_order = 'DESC';
    
    console.log('🔍 Executing count query...');
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM healthcare_professionals 
      ${whereClause}
    `;
    
    const countResult = await executeQuery(countQuery, params);
    console.log('📊 Count result:', countResult);
    
    console.log('🔍 Executing professionals query...');
    const professionalsQuery = `
      SELECT 
        id, first_name, last_name, email, phone, specialty, qualification,
        experience_years, rating, total_reviews, is_available, is_verified,
        profile_image, bio, created_at
      FROM healthcare_professionals 
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;
    
    const professionals = await executeQuery(professionalsQuery, [...params, parseInt(limit), offset]);
    console.log('👥 Professionals result:', professionals);
    
    res.json({
      success: true,
      data: {
        professionals: professionals.data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.data ? countResult.data[0].total : 0,
          pages: Math.ceil((countResult.data ? countResult.data[0].total : 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching professionals:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get healthcare professionals for home page (general professionals, not facility-specific)
router.get('/home/available', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const query = `
      SELECT 
        p.id, p.first_name, p.last_name, p.specialty, p.qualification,
        p.experience_years, p.rating, p.total_reviews, p.is_available,
        p.profile_image, p.bio, p.facility_id,
        f.name as facility_name, f.facility_type
      FROM healthcare_professionals p
      LEFT JOIN healthcare_facilities f ON p.facility_id = f.id
      WHERE p.is_verified = true 
      AND p.is_available = true
      ORDER BY p.rating DESC, p.experience_years DESC
      LIMIT ?
    `;
    
    const result = await executeQuery(query, [parseInt(limit)]);
    
    if (!result.success) {
      console.error('❌ Query failed:', result.error);
      return res.status(500).json({ success: false, message: 'Database query failed' });
    }
    
    const professionals = result.data;
    
    res.json({ 
      success: true, 
      data: {
        professionals: professionals.map(professional => ({
          ...professional,
          rating: parseFloat(professional.rating) || 0,
          total_reviews: parseInt(professional.total_reviews) || 0,
          experience_years: parseInt(professional.experience_years) || 0,
          full_name: `${professional.first_name} ${professional.last_name}`,
          experience_text: `${professional.experience_years || 0} years experience`
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching available professionals:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get professional specialties
router.get('/specialties/list', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT specialty, COUNT(*) as count
      FROM healthcare_professionals 
      WHERE is_verified = true 
      GROUP BY specialty 
      ORDER BY count DESC
    `;
    
    const specialties = await executeQuery(query);
    
    res.json({ success: true, data: specialties });
  } catch (error) {
    console.error('Error fetching specialties:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get professionals by facility ID
router.get('/facility/:facilityId', async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { limit = 10 } = req.query;
    
    // First check if facility exists
    const facilityResult = await executeQuery(
      'SELECT id, name, facility_type FROM healthcare_facilities WHERE id = ?',
      [facilityId]
    );
    
    if (!facilityResult.success || !facilityResult.data || facilityResult.data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Facility not found' 
      });
    }
    
    const facility = facilityResult.data[0];
    
    const query = `
      SELECT 
        p.id, p.first_name, p.last_name, p.specialty, p.qualification,
        p.experience_years, p.rating, p.total_reviews, p.is_available,
        p.profile_image, p.bio, p.facility_id,
        f.name as facility_name, f.facility_type
      FROM healthcare_professionals p
      LEFT JOIN healthcare_facilities f ON p.facility_id = f.id
      WHERE p.facility_id = ? 
      AND p.is_verified = true 
      AND p.is_available = true
      ORDER BY p.rating DESC, p.experience_years DESC
      LIMIT ?
    `;
    
    const result = await executeQuery(query, [facilityId, parseInt(limit)]);
    
    if (!result.success) {
      console.error('❌ Query failed:', result.error);
      return res.status(500).json({ success: false, message: 'Database query failed' });
    }
    
    const professionals = result.data;
    
    res.json({ 
      success: true, 
      data: {
        facility: {
          id: facility.id,
          name: facility.name,
          type: facility.facility_type
        },
        professionals: professionals.map(professional => ({
          ...professional,
          rating: parseFloat(professional.rating) || 0,
          total_reviews: parseInt(professional.total_reviews) || 0,
          experience_years: parseInt(professional.experience_years) || 0,
          full_name: `${professional.first_name} ${professional.last_name}`,
          experience_text: `${professional.experience_years || 0} years experience`
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching facility professionals:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Register new pharmacist
router.post('/register', upload.single('profileImage'), [
  body('firstName').trim().isLength({ min: 2, max: 100 }).withMessage('First name must be between 2 and 100 characters'),
  body('lastName').trim().isLength({ min: 2, max: 100 }).withMessage('Last name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('phone').trim().isLength({ min: 10, max: 20 }).withMessage('Phone number must be between 10 and 20 characters'),
  body('address').trim().isLength({ min: 5, max: 500 }).withMessage('Address must be between 5 and 500 characters'),
  body('city').trim().isLength({ min: 2, max: 100 }).withMessage('City must be between 2 and 100 characters'),
  body('licenseNumber').trim().isLength({ min: 5, max: 50 }).withMessage('License number must be between 5 and 50 characters'),
  body('education').trim().isLength({ min: 5, max: 200 }).withMessage('Education must be between 5 and 200 characters'),
  body('experience').trim().isLength({ min: 1, max: 50 }).withMessage('Experience must be between 1 and 50 characters'),
  body('specializations').notEmpty().withMessage('Specializations is required'),
  body('currentWorkplace').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Current workplace must be between 2 and 200 characters'),
  body('emergencyContact').trim().isLength({ min: 10, max: 20 }).withMessage('Emergency contact must be between 10 and 20 characters'),
  body('bio').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Bio must be between 10 and 1000 characters'),
  body('hasConsultation').notEmpty().withMessage('Has consultation is required'),
  body('hasCompounding').notEmpty().withMessage('Has compounding is required'),
  body('hasVaccination').notEmpty().withMessage('Has vaccination is required'),
  body('acceptsInsurance').notEmpty().withMessage('Accepts insurance is required'),
  body('userId').notEmpty().withMessage('User ID is required')
], async (req, res) => {
  try {
    console.log('🔍 Raw request body:', req.body);
    console.log('🔍 Request files:', req.file);
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 Content-Type:', req.headers['content-type']);
    console.log('🔍 Multer error:', req.fileValidationError);
    console.log('🔍 Multer errors:', req.fileValidationErrors);
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      licenseNumber,
      education,
      experience,
      specializations,
      currentWorkplace,
      emergencyContact,
      bio,
      hasConsultation,
      hasCompounding,
      hasVaccination,
      acceptsInsurance,
      userId
    } = req.body;

    // Process uploaded profile image
    let profileImagePath = null;
    if (req.file) {
      profileImagePath = `/uploads/professionals/${req.file.filename}`;
      console.log('✅ Profile image uploaded:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: profileImagePath
      });
    } else {
      console.log('❌ No profile image file received');
    }

    // Parse specializations from JSON string or array
    let specializationsArray = [];
    try {
      if (typeof specializations === 'string') {
        specializationsArray = JSON.parse(specializations);
      } else if (Array.isArray(specializations)) {
        specializationsArray = specializations;
      } else {
        throw new Error('Specializations must be an array or JSON string');
      }
    } catch (error) {
      console.error('Error parsing specializations:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid specializations format'
      });
    }

    // Convert boolean strings to actual booleans
    const hasConsultationBool = hasConsultation === 'true' || hasConsultation === true;
    const hasCompoundingBool = hasCompounding === 'true' || hasCompounding === true;
    const hasVaccinationBool = hasVaccination === 'true' || hasVaccination === true;
    const acceptsInsuranceBool = acceptsInsurance === 'true' || acceptsInsurance === true;

    console.log('🔍 Pharmacist registration data received:', {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      licenseNumber,
      education,
      experience,
      specializations,
      currentWorkplace,
      emergencyContact,
      bio,
      hasConsultation,
      hasCompounding,
      hasVaccination,
      acceptsInsurance,
      userId
    });

    // Check if email already exists
    const existingEmailResult = await executeQuery(
      'SELECT id FROM healthcare_professionals WHERE email = ?',
      [email]
    );

    if (existingEmailResult.success && existingEmailResult.data && existingEmailResult.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A professional with this email already exists'
      });
    }

    // Check if license number already exists
    const existingLicenseResult = await executeQuery(
      'SELECT id FROM healthcare_professionals WHERE license_number = ?',
      [licenseNumber]
    );

    if (existingLicenseResult.success && existingLicenseResult.data && existingLicenseResult.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A professional with this license number already exists'
      });
    }

    // Insert new pharmacist
    const insertQuery = `
      INSERT INTO healthcare_professionals (
        first_name, last_name, email, phone, address, city, license_number,
        qualification, experience_years, specializations, current_workplace,
        emergency_contact, bio, has_consultation, has_compounding, 
        has_vaccination, accepts_insurance, user_id, specialty, is_verified, profile_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const experienceYears = parseInt(experience) || 0;
    const specializationsJson = JSON.stringify(specializationsArray);
    const specialty = specializationsArray.length > 0 ? specializationsArray[0] : 'General Pharmacy';

    const insertResult = await executeQuery(insertQuery, [
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      licenseNumber,
      education,
      experienceYears,
      specializationsJson,
      currentWorkplace || null,
      emergencyContact,
      bio || null,
      hasConsultationBool,
      hasCompoundingBool,
      hasVaccinationBool,
      acceptsInsuranceBool,
      userId,
      specialty,
      false, // is_verified starts as false
      profileImagePath
    ]);

    if (!insertResult.success) {
      console.error('❌ Failed to insert pharmacist:', insertResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to register pharmacist'
      });
    }

    const pharmacistId = insertResult.data.insertId;

    console.log('✅ Pharmacist registered successfully with ID:', pharmacistId);

    res.status(201).json({
      success: true,
      message: 'Pharmacist registration submitted successfully. We will review your application and contact you within 3-5 business days.',
      data: {
        id: pharmacistId,
        firstName,
        lastName,
        email,
        specialty
      }
    });

  } catch (error) {
    console.error('Error registering pharmacist:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get professional by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        id, first_name, last_name, email, phone, specialty, qualification,
        experience_years, rating, total_reviews, is_available, is_verified,
        profile_image, bio, created_at
      FROM healthcare_professionals 
      WHERE id = ? AND is_verified = true
    `;
    
    const professionalResult = await executeQuery(query, [id]);
    
    if (!professionalResult.success || !professionalResult.data || professionalResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Professional not found' });
    }
    
    const professional = professionalResult.data[0];
    
    res.json({ success: true, data: professional });
  } catch (error) {
    console.error('Error fetching professional:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router; 