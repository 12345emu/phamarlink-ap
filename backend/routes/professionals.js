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
  body('userId').optional().trim()
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
          message: 'A pharmacist with this email already exists'
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
          const emailSent = await sendPharmacistCredentials(email, firstName, password);
          if (emailSent) {
            console.log('✅ New credentials email sent successfully to converted user:', email);
          } else {
            console.log('⚠️ Failed to send credentials email to converted user:', email);
          }
        } catch (emailError) {
          console.error('❌ Error sending credentials email to converted user:', emailError);
          // Don't fail the registration if email fails
        }
      } else if (existingUser.user_type === 'pharmacist') {
        // User is already a pharmacist, don't send email again
        console.log('ℹ️ User is already a pharmacist, skipping email sending');
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
          const emailSent = await sendPharmacistCredentials(email, firstName, password);
          if (emailSent) {
            console.log('✅ Credentials email sent successfully to:', email);
          } else {
            console.log('⚠️ Failed to send credentials email to:', email);
          }
        } catch (emailError) {
          console.error('❌ Error sending credentials email:', emailError);
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
      profileImagePath
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
      profileImagePath
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
  body('userId').optional().trim()
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
          const emailSent = await sendDoctorCredentials(email, firstName, password);
          if (emailSent) {
            console.log('✅ New credentials email sent successfully to converted user:', email);
          } else {
            console.log('⚠️ Failed to send credentials email to converted user:', email);
          }
        } catch (emailError) {
          console.error('❌ Error sending credentials email to converted user:', emailError);
          // Don't fail the registration if email fails
        }
      } else if (existingUser.user_type === 'doctor') {
        // User is already a doctor, don't send email again
        console.log('ℹ️ User is already a doctor, skipping email sending');
      }
    } else {
      // Generate secure password for new user
      const { password, hash } = await generateSecurePassword();
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
        const emailSent = await sendDoctorCredentials(email, firstName, password);
        if (emailSent) {
          console.log('✅ Credentials email sent successfully to:', email);
        } else {
          console.log('⚠️ Failed to send credentials email to:', email);
        }
      } catch (emailError) {
        console.error('❌ Error sending credentials email:', emailError);
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
        has_vaccination, accepts_insurance, user_id, specialty, is_verified, profile_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      profileImagePath
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
      profileImagePath
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