const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { executeQuery } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateSecurePassword } = require('../utils/passwordGenerator');
const { sendPharmacistCredentials, sendDoctorCredentials } = require('../utils/emailService');

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

// Get healthcare professionals from users table (for chat system compatibility)
// Note: This endpoint does NOT require authentication to allow patients to browse professionals
// Simplified to use only users table - no joins needed
router.get('/from-users', async (req, res) => {
  try {
    console.log('🔍 GET /professionals/from-users route hit');
    console.log('📝 Query params:', req.query);
    
    const { 
      page = 1, 
      limit = 100, 
      search,
      sort_by = 'first_name',
      sort_order = 'ASC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build WHERE clause - just users table
    let whereClause = "WHERE user_type IN ('doctor', 'pharmacist') AND is_active = 1";
    let params = [];
    
    // Search filter
    if (search) {
      whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Validate sort parameters
    const allowedSortFields = ['first_name', 'last_name', 'email', 'created_at'];
    const allowedSortOrders = ['ASC', 'DESC'];
    
    if (!allowedSortFields.includes(sort_by)) sort_by = 'first_name';
    if (!allowedSortOrders.includes(sort_order.toUpperCase())) sort_order = 'ASC';
    
    // Count query - just users table
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users
      ${whereClause}
    `;
    
    const countResult = await executeQuery(countQuery, params);
    
    // Main query - just users table, no joins
    const professionalsQuery = `
      SELECT 
        id as user_id,
        first_name,
        last_name,
        email,
        phone,
        user_type,
        profile_image,
        is_active,
        created_at
      FROM users
      ${whereClause}
      ORDER BY ${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;
    
    const professionals = await executeQuery(professionalsQuery, [...params, parseInt(limit), offset]);
    
    if (!professionals.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database query failed',
        error: professionals.error
      });
    }
    
    // Process results - simple mapping from users table
    const processedProfessionals = (professionals.data || []).map(user => ({
      id: user.user_id, // Use user_id as id for React keys
      user_id: user.user_id,
      facility_id: null,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone || null,
      specialty: user.user_type === 'doctor' ? 'General Practitioner' : 'Pharmacist',
      qualification: null,
      experience_years: 0,
      rating: null,
      total_reviews: 0,
      is_available: true, // Default to available
      is_verified: false, // Default to not verified
      is_active: user.is_active === 1 || user.is_active === true,
      profile_image: user.profile_image || null,
      bio: null,
      facility_name: null,
      facility_type: null,
      facility_address: null,
      facility_phone: null,
      user_type: user.user_type,
      created_at: user.created_at
    }));
    
    // Log response for debugging
    console.log(`✅ Returning ${processedProfessionals.length} professionals from users table`);
    console.log(`📊 Sample professional:`, processedProfessionals[0] || 'No professionals');
    console.log(`📊 Response structure:`, {
      success: true,
      hasData: true,
      professionalsCount: processedProfessionals.length,
      firstProfessionalId: processedProfessionals[0]?.id,
      firstProfessionalName: processedProfessionals[0] ? `${processedProfessionals[0].first_name} ${processedProfessionals[0].last_name}` : 'N/A'
    });
    
    const responseData = {
      success: true,
      data: {
        professionals: processedProfessionals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.data && countResult.data[0] ? countResult.data[0].total : processedProfessionals.length,
          pages: Math.ceil((countResult.data && countResult.data[0] ? countResult.data[0].total : processedProfessionals.length) / limit)
        }
      }
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('❌ Error fetching professionals from users:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
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
    
    let whereClause = 'WHERE hp.is_verified = true';
    let params = [];
    
    if (search) {
      whereClause += ' AND (hp.first_name LIKE ? OR hp.last_name LIKE ? OR hp.specialty LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (specialty) {
      whereClause += ' AND hp.specialty = ?';
      params.push(specialty);
    }
    
    if (is_available !== undefined) {
      whereClause += ' AND hp.is_available = ?';
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
      FROM healthcare_professionals hp
      LEFT JOIN healthcare_facilities hf ON hp.facility_id = hf.id
      ${whereClause}
    `;
    
    const countResult = await executeQuery(countQuery, params);
    console.log('📊 Count result:', countResult);
    
    console.log('🔍 Executing professionals query...');
    const professionalsQuery = `
      SELECT 
        hp.id, hp.first_name, hp.last_name, hp.email, hp.phone, hp.specialty, hp.qualification,
        hp.experience_years, hp.rating, hp.total_reviews, hp.is_available, hp.is_verified,
        hp.profile_image, hp.bio, hp.created_at, hp.facility_id,
        hf.name as facility_name, hf.facility_type, hf.address as facility_address, hf.phone as facility_phone
      FROM healthcare_professionals hp
      LEFT JOIN healthcare_facilities hf ON hp.facility_id = hf.id
      ${whereClause}
      ORDER BY hp.${sort_by} ${sort_order}
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
    const { limit = 10, includeAll = false } = req.query;
    
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
    
    // Build WHERE clause - if includeAll is true, don't filter by verification/availability
    let whereClause = 'WHERE p.facility_id = ?';
    if (includeAll !== 'true' && includeAll !== true) {
      whereClause += ' AND p.is_verified = true AND p.is_available = true';
    }
    
    const query = `
      SELECT 
        p.id, p.user_id, p.first_name, p.last_name, p.specialty, p.qualification,
        p.experience_years, p.rating, p.total_reviews, p.is_available, p.is_verified,
        p.profile_image, p.bio, p.facility_id, p.email, p.phone, p.license_number,
        f.name as facility_name, f.facility_type
      FROM healthcare_professionals p
      LEFT JOIN healthcare_facilities f ON p.facility_id = f.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ?
    `;
    
    const queryParams = includeAll === 'true' || includeAll === true 
      ? [facilityId, parseInt(limit)]
      : [facilityId, parseInt(limit)];
    
    const result = await executeQuery(query, queryParams);
    
    if (!result.success) {
      console.error('❌ Query failed:', result.error);
      return res.status(500).json({ success: false, message: 'Database query failed' });
    }
    
    const professionals = result.data;
    
    console.log('🔍 Facility professionals query result:', {
      facilityId,
      includeAll,
      count: professionals.length
    });
    
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
  body('userId').optional().trim(),
  body('facilityId').optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Optional field, skip validation
      }
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        throw new Error('Facility ID must be a positive integer');
      }
      return true;
    })
    .toInt()
], async (req, res) => {
  try {
    console.log('🔍 Raw request body:', req.body);
    console.log('🔍 Request files:', req.file);
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 Content-Type:', req.headers['content-type']);
    console.log('🔍 Multer error:', req.fileValidationError);
    console.log('🔍 Multer errors:', req.fileValidationErrors);
    console.log('🔍 FacilityId from request:', req.body.facilityId);
    console.log('🔍 FacilityId type:', typeof req.body.facilityId);
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
      userId,
      facilityId
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

    // Check if email already exists in users table
    const existingUserResult = await executeQuery(
      'SELECT id, user_type FROM users WHERE email = ?',
      [email]
    );

    let finalUserId = userId || null;

    if (existingUserResult.success && existingUserResult.data && existingUserResult.data.length > 0) {
      const existingUser = existingUserResult.data[0];
      
      // If user exists and is already a pharmacist, return error
      if (existingUser.user_type === 'pharmacist') {
        return res.status(400).json({
          success: false,
          message: 'A pharmacist with this email address already exists. Please use a different email address or contact support if you need to recover your account.'
        });
      }
      
      // If user exists with a different user type (not patient), return error
      if (existingUser.user_type !== 'patient') {
        return res.status(400).json({
          success: false,
          message: `This email address is already registered as a ${existingUser.user_type}. Please use a different email address to register as a pharmacist.`
        });
      }
      
      // If user exists as patient, update their type to pharmacist and generate new password
      if (existingUser.user_type === 'patient') {
        // Generate new secure password for converted user
        const { password, hash } = await generateSecurePassword();
        console.log('🔐 Generated new password for converted pharmacist:', password);
        
        const updateUserResult = await executeQuery(
          'UPDATE users SET user_type = ?, first_name = ?, last_name = ?, phone = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['pharmacist', firstName, lastName, phone, hash, existingUser.id]
        );
        
        if (!updateUserResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to update user type'
          });
        }
        
        finalUserId = existingUser.id;
        console.log('✅ Updated existing patient to pharmacist:', finalUserId);
        
        // Send new credentials email to converted user
        try {
          console.log('📧 Attempting to send credentials email to converted user:', email);
          console.log('📧 Email details:', {
            email,
            firstName,
            passwordLength: password.length
          });
          const emailSent = await sendPharmacistCredentials(email, firstName, password);
          if (emailSent) {
            console.log('✅ New credentials email sent successfully to converted user:', email);
          } else {
            console.log('⚠️ Failed to send credentials email to converted user:', email);
            console.log('⚠️ sendPharmacistCredentials returned false');
          }
        } catch (emailError) {
          console.error('❌ Error sending credentials email to converted user:', emailError);
          console.error('❌ Error stack:', emailError.stack);
          console.error('❌ Error details:', {
            message: emailError.message,
            code: emailError.code,
            command: emailError.command
          });
          // Don't fail the registration if email fails
        }
      }
    } else {
      // Generate secure password for new user
      const { password, hash } = await generateSecurePassword();
      console.log('🔐 Generated password for new pharmacist:', password);
      
      // Create new user if email doesn't exist
      const createUserResult = await executeQuery(
        'INSERT INTO users (email, password_hash, user_type, first_name, last_name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [email, hash, 'pharmacist', firstName, lastName, phone]
      );
      
      if (!createUserResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account'
        });
      }
      
      finalUserId = createUserResult.data.insertId;
      console.log('✅ Created new user for pharmacist:', finalUserId);
      
      // Send credentials email to new user
      try {
        console.log('📧 Attempting to send credentials email to:', email);
        console.log('📧 Email details:', {
          email,
          firstName,
          passwordLength: password.length
        });
        const emailSent = await sendPharmacistCredentials(email, firstName, password);
        if (emailSent) {
          console.log('✅ Credentials email sent successfully to:', email);
        } else {
          console.log('⚠️ Failed to send credentials email to:', email);
          console.log('⚠️ sendPharmacistCredentials returned false');
        }
      } catch (emailError) {
        console.error('❌ Error sending credentials email:', emailError);
        console.error('❌ Error stack:', emailError.stack);
        console.error('❌ Error details:', {
          message: emailError.message,
          code: emailError.code,
          command: emailError.command
        });
        // Don't fail the registration if email fails
      }
    }

    // Check if email already exists in healthcare_professionals table
    const existingProfessionalResult = await executeQuery(
      'SELECT id FROM healthcare_professionals WHERE email = ?',
      [email]
    );

    if (existingProfessionalResult.success && existingProfessionalResult.data && existingProfessionalResult.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A healthcare professional with this email address already exists in our system. Please use a different email address or contact support for assistance.'
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
        message: 'A healthcare professional with this license number already exists. Please verify your license number or contact support if you believe this is an error.'
      });
    }

    // Insert new pharmacist
    const insertQuery = `
      INSERT INTO healthcare_professionals (
        first_name, last_name, email, phone, address, city, license_number,
        qualification, experience_years, specializations, current_workplace,
        emergency_contact, bio, has_consultation, has_compounding, 
        has_vaccination, accepts_insurance, user_id, specialty, is_verified, profile_image, facility_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const experienceYears = parseInt(experience) || 0;
    const specializationsJson = JSON.stringify(specializationsArray);
    const specialty = specializationsArray.length > 0 ? specializationsArray[0] : 'General Pharmacy';

    console.log('🔍 About to insert into healthcare_professionals with data:', {
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
      currentWorkplace: currentWorkplace || null,
      emergencyContact,
      bio: bio || null,
      hasConsultationBool,
      hasCompoundingBool,
      hasVaccinationBool,
      acceptsInsuranceBool,
      finalUserId,
      specialty,
      profileImagePath,
      facilityId: facilityId || null
    });

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
      finalUserId,
      specialty,
      false, // is_verified starts as false
      profileImagePath,
      facilityId || null
    ]);

    console.log('🔍 Insert result:', insertResult);

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
      message: 'Pharmacist registration completed successfully! Your login credentials have been sent to your email address. Please check your inbox and spam folder.',
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

// Register new doctor
router.post('/register-doctor', upload.single('profileImage'), [
  body('firstName').trim().isLength({ min: 2, max: 100 }).withMessage('First name must be between 2 and 100 characters'),
  body('lastName').trim().isLength({ min: 2, max: 100 }).withMessage('Last name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('phone').trim().isLength({ min: 10, max: 20 }).withMessage('Phone number must be between 10 and 20 characters'),
  body('address').trim().isLength({ min: 5, max: 500 }).withMessage('Address must be between 5 and 500 characters'),
  body('city').trim().isLength({ min: 2, max: 100 }).withMessage('City must be between 2 and 100 characters'),
  body('licenseNumber').trim().isLength({ min: 5, max: 50 }).withMessage('License number must be between 5 and 50 characters'),
  body('medicalSchool').trim().isLength({ min: 5, max: 200 }).withMessage('Medical school must be between 5 and 200 characters'),
  body('graduationYear').trim().isLength({ min: 4, max: 4 }).withMessage('Graduation year must be 4 digits'),
  body('experience').trim().isLength({ min: 1, max: 50 }).withMessage('Experience must be between 1 and 50 characters'),
  body('specialties').notEmpty().withMessage('Specialties is required'),
  body('currentHospital').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Current hospital must be between 2 and 200 characters'),
  body('emergencyContact').trim().isLength({ min: 10, max: 20 }).withMessage('Emergency contact must be between 10 and 20 characters'),
  body('bio').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Bio must be between 10 and 1000 characters'),
  body('hasTelemedicine').notEmpty().withMessage('Has telemedicine is required'),
  body('hasEmergency').notEmpty().withMessage('Has emergency is required'),
  body('hasSurgery').notEmpty().withMessage('Has surgery is required'),
  body('acceptsInsurance').notEmpty().withMessage('Accepts insurance is required'),
  body('userId').optional().trim(),
  body('facilityId').optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === null || value === undefined || value === '') {
        return true; // Optional field, skip validation
      }
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        throw new Error('Facility ID must be a positive integer');
      }
      return true;
    })
    .toInt()
], async (req, res) => {
  try {
    console.log('🔍 Raw request body:', req.body);
    console.log('🔍 Request files:', req.file);
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 Content-Type:', req.headers['content-type']);
    console.log('🔍 Multer error:', req.fileValidationError);
    console.log('🔍 Multer errors:', req.fileValidationErrors);
    console.log('🔍 FacilityId from request:', req.body.facilityId);
    console.log('🔍 FacilityId type:', typeof req.body.facilityId);
    
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
      medicalSchool,
      graduationYear,
      experience,
      specialties,
      currentHospital,
      emergencyContact,
      bio,
      hasTelemedicine,
      hasEmergency,
      hasSurgery,
      acceptsInsurance,
      userId,
      facilityId
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

    // Parse specialties from JSON string or array
    let specialtiesArray = [];
    try {
      if (typeof specialties === 'string') {
        specialtiesArray = JSON.parse(specialties);
      } else if (Array.isArray(specialties)) {
        specialtiesArray = specialties;
      } else {
        throw new Error('Specialties must be an array or JSON string');
      }
    } catch (error) {
      console.error('Error parsing specialties:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid specialties format'
      });
    }

    // Convert boolean strings to actual booleans
    const hasTelemedicineBool = hasTelemedicine === 'true' || hasTelemedicine === true;
    const hasEmergencyBool = hasEmergency === 'true' || hasEmergency === true;
    const hasSurgeryBool = hasSurgery === 'true' || hasSurgery === true;
    const acceptsInsuranceBool = acceptsInsurance === 'true' || acceptsInsurance === true;

    console.log('🔍 Doctor registration data received:', {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      licenseNumber,
      medicalSchool,
      graduationYear,
      experience,
      specialties,
      currentHospital,
      emergencyContact,
      bio,
      hasTelemedicine,
      hasEmergency,
      hasSurgery,
      acceptsInsurance,
      userId
    });

    // Check if email already exists in users table
    const existingUserResult = await executeQuery(
      'SELECT id, user_type FROM users WHERE email = ?',
      [email]
    );

    let finalUserId = userId || null;
    let generatedPassword; // Store password for email sending

    if (existingUserResult.success && existingUserResult.data && existingUserResult.data.length > 0) {
      const existingUser = existingUserResult.data[0];
      
      // If user exists and is already a doctor, return error
      if (existingUser.user_type === 'doctor') {
        return res.status(400).json({
          success: false,
          message: 'A doctor with this email already exists'
        });
      }
      
      // If user exists as patient, update their type to doctor and generate new password
      if (existingUser.user_type === 'patient') {
        // Generate new secure password for converted user
        const { password, hash } = await generateSecurePassword();
        generatedPassword = password; // Store for email sending
        console.log('🔐 Generated new password for converted doctor:', password);
        
        const updateUserResult = await executeQuery(
          'UPDATE users SET user_type = ?, first_name = ?, last_name = ?, phone = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['doctor', firstName, lastName, phone, hash, existingUser.id]
        );
        
        if (!updateUserResult.success) {
          return res.status(500).json({
            success: false,
            message: 'Failed to update user type'
          });
        }
        
        finalUserId = existingUser.id;
        console.log('✅ Updated existing patient to doctor:', finalUserId);
        
        // Send new credentials email to converted user
        try {
          console.log('📧 Attempting to send credentials email to converted user:', email);
          console.log('📧 Email details:', {
            email,
            firstName,
            passwordLength: password.length
          });
          const emailSent = await sendDoctorCredentials(email, firstName, password);
          if (emailSent) {
            console.log('✅ New credentials email sent successfully to converted user:', email);
          } else {
            console.log('⚠️ Failed to send credentials email to converted user:', email);
            console.log('⚠️ sendDoctorCredentials returned false');
          }
        } catch (emailError) {
          console.error('❌ Error sending credentials email to converted user:', emailError);
          console.error('❌ Error stack:', emailError.stack);
          console.error('❌ Error details:', {
            message: emailError.message,
            code: emailError.code,
            command: emailError.command
          });
          // Don't fail the registration if email fails
        }
      } else if (existingUser.user_type === 'doctor') {
        // User is already a doctor, don't send email again
        console.log('ℹ️ User is already a doctor, skipping email sending');
      }
    } else {
      // Generate secure password for new user
      const { password, hash } = await generateSecurePassword();
      generatedPassword = password; // Store for email sending
      console.log('🔐 Generated password for new doctor:', password);
      
      // Create new user if email doesn't exist
      const createUserResult = await executeQuery(
        'INSERT INTO users (email, password_hash, user_type, first_name, last_name, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [email, hash, 'doctor', firstName, lastName, phone]
      );
      
      if (!createUserResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account'
        });
      }
      
      finalUserId = createUserResult.data.insertId;
      console.log('✅ Created new user for doctor:', finalUserId);
      
      // Send credentials email to new user
      try {
        console.log('📧 Attempting to send credentials email to:', email);
        console.log('📧 Email details:', {
          email,
          firstName,
          passwordLength: password.length
        });
        const emailSent = await sendDoctorCredentials(email, firstName, password);
        if (emailSent) {
          console.log('✅ Credentials email sent successfully to:', email);
        } else {
          console.log('⚠️ Failed to send credentials email to:', email);
          console.log('⚠️ sendDoctorCredentials returned false');
        }
      } catch (emailError) {
        console.error('❌ Error sending credentials email:', emailError);
        console.error('❌ Error stack:', emailError.stack);
        console.error('❌ Error details:', {
          message: emailError.message,
          code: emailError.code,
          command: emailError.command
        });
        // Don't fail the registration if email fails
      }
    }

    // Check if email already exists in healthcare_professionals table
    const existingProfessionalResult = await executeQuery(
      'SELECT id FROM healthcare_professionals WHERE email = ?',
      [email]
    );

    if (existingProfessionalResult.success && existingProfessionalResult.data && existingProfessionalResult.data.length > 0) {
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

    // Insert new doctor
    const insertQuery = `
      INSERT INTO healthcare_professionals (
        first_name, last_name, email, phone, address, city, license_number,
        qualification, experience_years, specializations, current_workplace,
        emergency_contact, bio, has_consultation, has_compounding, 
        has_vaccination, accepts_insurance, user_id, specialty, is_verified, profile_image, facility_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const experienceYears = parseInt(experience) || 0;
    const specialtiesJson = JSON.stringify(specialtiesArray);
    const specialty = specialtiesArray.length > 0 ? specialtiesArray[0] : 'General Medicine';
    const qualification = `${medicalSchool} (${graduationYear})`;

    console.log('🔍 About to insert into healthcare_professionals with data:', {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      licenseNumber,
      qualification,
      experienceYears,
      specialtiesJson,
      currentWorkplace: currentHospital || null,
      emergencyContact,
      bio: bio || null,
      hasConsultation: hasTelemedicineBool,
      hasCompounding: hasSurgeryBool,
      hasVaccination: hasEmergencyBool,
      acceptsInsurance: acceptsInsuranceBool,
      finalUserId,
      specialty,
      profileImagePath,
      facilityId: facilityId || null
    });

    const insertResult = await executeQuery(insertQuery, [
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      licenseNumber,
      qualification,
      experienceYears,
      specialtiesJson,
      currentHospital || null,
      emergencyContact,
      bio || null,
      hasTelemedicineBool,
      hasSurgeryBool,
      hasEmergencyBool,
      acceptsInsuranceBool,
      finalUserId,
      specialty,
      false, // is_verified starts as false
      profileImagePath,
      facilityId || null
    ]);

    console.log('🔍 Insert result:', insertResult);

    if (!insertResult.success) {
      console.error('❌ Failed to insert doctor:', insertResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to register doctor'
      });
    }

    const doctorId = insertResult.data.insertId;

    console.log('✅ Doctor registered successfully with ID:', doctorId);
    console.log('🔍 About to send email - generatedPassword exists:', !!generatedPassword);
    console.log('🔍 About to send email - email:', email);
    console.log('🔍 About to send email - firstName:', firstName);

    // Send email with credentials
    try {
      console.log('📧 Sending doctor credentials email to:', email);
      console.log('📧 Email details:', { email, firstName, passwordLength: generatedPassword?.length });
      const emailSent = await sendDoctorCredentials(email, firstName, generatedPassword);
      
      if (emailSent) {
        console.log('✅ Doctor credentials email sent successfully to:', email);
      } else {
        console.log('⚠️ Failed to send doctor credentials email to:', email, 'but registration was successful');
      }
    } catch (emailError) {
      console.error('❌ Error sending doctor credentials email to:', email, 'Error:', emailError.message);
      console.error('❌ Full error details:', emailError);
      // Don't fail the registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Doctor registration completed successfully! Your login credentials have been sent to your email address. Please check your inbox and spam folder.',
      data: {
        id: doctorId,
        firstName,
        lastName,
        email,
        specialty
      }
    });

  } catch (error) {
    console.error('Error registering doctor:', error);
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
        p.id, p.first_name, p.last_name, p.email, p.phone, p.specialty, p.qualification,
        p.experience_years, p.rating, p.total_reviews, p.is_available, p.is_verified,
        p.profile_image, p.bio, p.created_at, p.license_number, p.address, p.city,
        p.facility_id, f.name as facility_name
      FROM healthcare_professionals p
      LEFT JOIN healthcare_facilities f ON p.facility_id = f.id
      WHERE p.id = ?
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

// Update professional (for facility admins)
router.put('/:id', authenticateToken, requireRole(['facility-admin', 'admin']), upload.single('profileImage'), [
  body('firstName').optional().trim().isLength({ min: 2, max: 100 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().trim().isLength({ min: 10, max: 20 }),
  body('address').optional().trim().isLength({ min: 5, max: 500 }),
  body('city').optional().trim().isLength({ min: 2, max: 100 }),
  body('specialty').optional().trim().isLength({ min: 2, max: 100 }),
  body('licenseNumber').optional().trim().isLength({ min: 5, max: 50 }),
  body('qualification').optional().trim().isLength({ min: 2, max: 200 }),
  body('experienceYears').optional().isInt({ min: 0, max: 100 }),
  body('bio').optional().trim().isLength({ max: 1000 }),
  body('isVerified').optional().isBoolean(),
  body('isAvailable').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Check if professional exists and belongs to the facility
    const checkQuery = `SELECT facility_id, user_id FROM healthcare_professionals WHERE id = ?`;
    const checkResult = await executeQuery(checkQuery, [id]);

    if (!checkResult.success || !checkResult.data || checkResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Professional not found' });
    }

    const professional = checkResult.data[0];
    
    // If user is facility-admin, verify they manage this facility
    if (req.user.role === 'facility-admin' && professional.facility_id) {
      const facilityCheckQuery = `SELECT id FROM healthcare_facilities WHERE id = ? AND admin_id = ?`;
      const facilityCheckResult = await executeQuery(facilityCheckQuery, [professional.facility_id, req.user.id]);
      
      if (!facilityCheckResult.success || !facilityCheckResult.data || facilityCheckResult.data.length === 0) {
        return res.status(403).json({ success: false, message: 'You do not have permission to manage this staff member' });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (updateData.firstName) {
      updateFields.push('first_name = ?');
      updateValues.push(updateData.firstName);
    }
    if (updateData.lastName) {
      updateFields.push('last_name = ?');
      updateValues.push(updateData.lastName);
    }
    if (updateData.email) {
      // Check if email is already taken by another professional
      const emailCheckQuery = `SELECT id FROM healthcare_professionals WHERE email = ? AND id != ?`;
      const emailCheckResult = await executeQuery(emailCheckQuery, [updateData.email, id]);
      
      if (emailCheckResult.success && emailCheckResult.data && emailCheckResult.data.length > 0) {
        return res.status(400).json({ success: false, message: 'Email address is already in use' });
      }
      
      updateFields.push('email = ?');
      updateValues.push(updateData.email);
    }
    if (updateData.phone) {
      updateFields.push('phone = ?');
      updateValues.push(updateData.phone);
    }
    if (updateData.address) {
      updateFields.push('address = ?');
      updateValues.push(updateData.address);
    }
    if (updateData.city) {
      updateFields.push('city = ?');
      updateValues.push(updateData.city);
    }
    if (updateData.specialty) {
      updateFields.push('specialty = ?');
      updateValues.push(updateData.specialty);
    }
    if (updateData.licenseNumber) {
      // Check if license number is already taken
      const licenseCheckQuery = `SELECT id FROM healthcare_professionals WHERE license_number = ? AND id != ?`;
      const licenseCheckResult = await executeQuery(licenseCheckQuery, [updateData.licenseNumber, id]);
      
      if (licenseCheckResult.success && licenseCheckResult.data && licenseCheckResult.data.length > 0) {
        return res.status(400).json({ success: false, message: 'License number is already in use' });
      }
      
      updateFields.push('license_number = ?');
      updateValues.push(updateData.licenseNumber);
    }
    if (updateData.qualification) {
      updateFields.push('qualification = ?');
      updateValues.push(updateData.qualification);
    }
    if (updateData.experienceYears !== undefined) {
      updateFields.push('experience_years = ?');
      updateValues.push(updateData.experienceYears);
    }
    if (updateData.bio !== undefined) {
      updateFields.push('bio = ?');
      updateValues.push(updateData.bio);
    }
    if (updateData.isVerified !== undefined) {
      updateFields.push('is_verified = ?');
      updateValues.push(updateData.isVerified ? 1 : 0);
    }
    if (updateData.isAvailable !== undefined) {
      updateFields.push('is_available = ?');
      updateValues.push(updateData.isAvailable ? 1 : 0);
    }
    let profileImagePath = null;
    if (req.file) {
      profileImagePath = `/uploads/professionals/${req.file.filename}`;
      updateFields.push('profile_image = ?');
      updateValues.push(profileImagePath);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    const updateQuery = `UPDATE healthcare_professionals SET ${updateFields.join(', ')} WHERE id = ?`;
    const updateResult = await executeQuery(updateQuery, updateValues);

    if (!updateResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to update professional' });
    }

    // Also update the profile image in the users table if it was updated
    if (profileImagePath && professional.user_id) {
      const updateUserQuery = `UPDATE users SET profile_image = ?, updated_at = NOW() WHERE id = ?`;
      const updateUserResult = await executeQuery(updateUserQuery, [profileImagePath, professional.user_id]);
      
      if (!updateUserResult.success) {
        console.error('⚠️ Failed to update profile image in users table, but professional was updated');
        // Don't fail the request, just log the warning
      } else {
        console.log('✅ Profile image updated in both healthcare_professionals and users tables');
      }
    }

    // Fetch updated professional
    const fetchQuery = `
      SELECT 
        p.id, p.first_name, p.last_name, p.email, p.phone, p.specialty, p.qualification,
        p.experience_years, p.rating, p.total_reviews, p.is_available, p.is_verified,
        p.profile_image, p.bio, p.license_number, p.address, p.city, p.facility_id,
        f.name as facility_name
      FROM healthcare_professionals p
      LEFT JOIN healthcare_facilities f ON p.facility_id = f.id
      WHERE p.id = ?
    `;
    const fetchResult = await executeQuery(fetchQuery, [id]);

    res.json({
      success: true,
      message: 'Professional updated successfully',
      data: fetchResult.data[0]
    });
  } catch (error) {
    console.error('Error updating professional:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete professional (for facility admins)
router.delete('/:id', authenticateToken, requireRole(['facility-admin', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if professional exists and belongs to the facility
    const checkQuery = `SELECT facility_id FROM healthcare_professionals WHERE id = ?`;
    const checkResult = await executeQuery(checkQuery, [id]);

    if (!checkResult.success || !checkResult.data || checkResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Professional not found' });
    }

    const professional = checkResult.data[0];
    
    // If user is facility-admin, verify they manage this facility
    if (req.user.role === 'facility-admin' && professional.facility_id) {
      const facilityCheckQuery = `SELECT id FROM healthcare_facilities WHERE id = ? AND admin_id = ?`;
      const facilityCheckResult = await executeQuery(facilityCheckQuery, [professional.facility_id, req.user.id]);
      
      if (!facilityCheckResult.success || !facilityCheckResult.data || facilityCheckResult.data.length === 0) {
        return res.status(403).json({ success: false, message: 'You do not have permission to delete this staff member' });
      }
    }

    // Soft delete by setting is_available to false and is_verified to false
    // Or hard delete - let's use soft delete for safety
    const deleteQuery = `UPDATE healthcare_professionals SET is_available = 0, is_verified = 0, updated_at = NOW() WHERE id = ?`;
    const deleteResult = await executeQuery(deleteQuery, [id]);

    if (!deleteResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to delete professional' });
    }

    res.json({
      success: true,
      message: 'Staff member removed successfully'
    });
  } catch (error) {
    console.error('Error deleting professional:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router; 