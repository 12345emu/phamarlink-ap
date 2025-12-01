const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logRequest = require('../log-requests');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profile-images');
    console.log('🔍 Multer destination - upload directory:', uploadDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      console.log('📁 Creating upload directory...');
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user ? req.user.id : 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `profile-${userId}-${timestamp}${ext}`;
    console.log('🔍 Multer filename - generated:', filename);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  console.log('🔍 File filter - checking file:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    fieldname: file.fieldname,
    size: file.size
  });
  
  // Accept image files with more lenient checking
  if (file.mimetype && (
    file.mimetype.startsWith('image/') ||
    file.mimetype.includes('jpeg') ||
    file.mimetype.includes('jpg') ||
    file.mimetype.includes('png') ||
    file.mimetype.includes('webp') ||
    file.mimetype.includes('heic') ||
    file.mimetype.includes('heif')
  )) {
    console.log('✅ File type accepted:', file.mimetype);
    cb(null, true);
  } else {
    console.log('❌ File type rejected - mimetype:', file.mimetype);
    cb(new Error('Only image files are allowed (JPEG, PNG, WebP, HEIC)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (increased for better user experience)
  },
  onError: function (err, next) {
    console.log('❌ Multer error:', err);
    next(err);
  }
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

// User Registration
router.post('/signup', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 2 }),
  body('lastName').trim().isLength({ min: 2 }),
  body('userType').isIn(['patient', 'doctor', 'pharmacist','admin','facility-admin']),
  body('phone').optional().isMobilePhone()
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

    const { email, password, firstName, lastName, userType, phone, dateOfBirth } = req.body;

    // Check if user already exists
    const existingUserQuery = 'SELECT id FROM users WHERE email = ?';
    const existingUserResult = await executeQuery(existingUserQuery, [email]);
    
    if (existingUserResult.success && existingUserResult.data.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const insertUserQuery = `
      INSERT INTO users (email, password_hash, user_type, first_name, last_name, phone, date_of_birth)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const insertResult = await executeQuery(insertUserQuery, [
      email, passwordHash, userType, firstName, lastName, phone, dateOfBirth
    ]);

    if (!insertResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }

    const userId = insertResult.data.insertId;

    // Create patient profile if user is a patient
    if (userType === 'patient') {
      const profileQuery = 'INSERT INTO patient_profiles (user_id) VALUES (?)';
      await executeQuery(profileQuery, [userId]);
    }

    // Generate tokens
    const token = generateToken(userId);
    const refreshToken = generateRefreshToken(userId);

    // Get user data (without password)
    const userQuery = 'SELECT id, email, user_type, first_name, last_name, phone, date_of_birth, created_at FROM users WHERE id = ?';
    const userResult = await executeQuery(userQuery, [userId]);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResult.data[0],
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// User Login
router.post('/login', logRequest, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    // Detailed logging for debugging
    console.log('🔍 LOGIN REQUEST DEBUG:');
    console.log('📋 Headers:', req.headers);
    console.log('📦 Raw body:', req.body);
    console.log('📊 Body type:', typeof req.body);
    console.log('📊 Body keys:', Object.keys(req.body || {}));
    
    if (req.body.email) {
      console.log('📧 Email value:', `"${req.body.email}"`);
      console.log('📧 Email length:', req.body.email.length);
      console.log('📧 Email type:', typeof req.body.email);
      console.log('📧 Email includes @:', req.body.email.includes('@'));
    }
    
    if (req.body.password) {
      console.log('🔑 Password value:', `"${req.body.password}"`);
      console.log('🔑 Password length:', req.body.password.length);
      console.log('🔑 Password type:', typeof req.body.password);
    }
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ VALIDATION ERRORS:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const userQuery = `
      SELECT id, email, password_hash, user_type, first_name, last_name, phone, 
             date_of_birth, profile_image, is_active, email_verified, created_at
      FROM users WHERE email = ?
    `;
    const userResult = await executeQuery(userQuery, [email]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = userResult.data[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Remove password from response
    delete user.password_hash;

    // Transform field names to match frontend expectations
    const transformedUser = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      dateOfBirth: user.date_of_birth,
      role: user.user_type,
      profileImage: user.profile_image,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    // Debug logging for profile image
    console.log('🔍 Backend - User profile_image from database:', user.profile_image);
    console.log('🔍 Backend - Transformed profileImage:', transformedUser.profileImage);
    console.log('🔍 Backend - Full transformed user object:', {
      id: transformedUser.id,
      email: transformedUser.email,
      profileImage: transformedUser.profileImage
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: transformedUser,
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data
    const userQuery = `
      SELECT id, email, user_type, first_name, last_name, phone, 
             date_of_birth, profile_image, is_active, email_verified, created_at
      FROM users WHERE id = ?
    `;
    const userResult = await executeQuery(userQuery, [userId]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.data[0];

    // Transform field names to match frontend expectations
    const transformedUser = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      dateOfBirth: user.date_of_birth,
      role: user.user_type,
      profileImage: user.profile_image,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    // Get patient profile if user is a patient
    if (user.user_type === 'patient') {
      const profileQuery = 'SELECT * FROM patient_profiles WHERE user_id = ?';
      const profileResult = await executeQuery(profileQuery, [userId]);
      
      if (profileResult.success && profileResult.data.length > 0) {
        transformedUser.patientProfile = profileResult.data[0];
      }
    }

    res.json({
      success: true,
      data: transformedUser
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 2 }),
  body('lastName').optional().trim().isLength({ min: 2 }),
  body('phone').optional().custom((value) => {
    if (!value) return true; // Allow empty values since it's optional
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(value)) {
      throw new Error('Phone number must be at least 10 digits and can include +, spaces, hyphens, and parentheses');
    }
    return true;
  }),
  body('address').optional().isString()
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
    const { firstName, lastName, phone, dateOfBirth, address } = req.body;

    // Debug logging for date of birth
    console.log('🔍 Backend - Update profile request:', {
      userId,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      address
    });

    // Verify user exists before update
    const checkUserQuery = 'SELECT id FROM users WHERE id = ?';
    const checkUserResult = await executeQuery(checkUserQuery, [userId]);
    
    if (!checkUserResult.success) {
      console.error('❌ Backend - Check user query failed:', checkUserResult.error);
      return res.status(500).json({
        success: false,
        message: 'Database error checking user'
      });
    }
    
    if (checkUserResult.data.length === 0) {
      console.error('❌ Backend - User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('🔍 Backend - User found:', checkUserResult.data[0]);

    // Update user - simplified query
    let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    let params = [];
    
    if (firstName) {
      updateQuery += ', first_name = ?';
      params.push(firstName);
    }
    if (lastName) {
      updateQuery += ', last_name = ?';
      params.push(lastName);
    }
    if (phone) {
      updateQuery += ', phone = ?';
      params.push(phone);
    }
    if (dateOfBirth) {
      updateQuery += ', date_of_birth = ?';
      params.push(dateOfBirth);
    }
    // Note: address is handled separately in patient_profiles table
    
    updateQuery += ' WHERE id = ?';
    params.push(userId);
    
    console.log('🔍 Backend - Update query:', updateQuery);
    console.log('🔍 Backend - Update params:', params);
    
    const updateResult = await executeQuery(updateQuery, params);

    console.log('🔍 Backend - Update query result:', {
      success: updateResult.success,
      affectedRows: updateResult.data?.affectedRows,
      dateOfBirth: dateOfBirth
    });

    if (!updateResult.success) {
      console.error('❌ Backend - Update query failed:', updateResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: updateResult.error
      });
    }

    // Handle address update in patient_profiles table
    if (address) {
      console.log('🔍 Backend - Updating address in patient_profiles table');
      
      // Check if patient profile exists
      const profileExistsQuery = 'SELECT id FROM patient_profiles WHERE user_id = ?';
      const profileExistsResult = await executeQuery(profileExistsQuery, [userId]);
      
      let addressUpdateResult;
      if (profileExistsResult.success && profileExistsResult.data.length > 0) {
        // Update existing profile
        const addressUpdateQuery = 'UPDATE patient_profiles SET address = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?';
        addressUpdateResult = await executeQuery(addressUpdateQuery, [address, userId]);
      } else {
        // Create new profile with address
        const addressInsertQuery = 'INSERT INTO patient_profiles (user_id, address) VALUES (?, ?)';
        addressUpdateResult = await executeQuery(addressInsertQuery, [userId, address]);
      }
      
      if (!addressUpdateResult.success) {
        console.error('❌ Backend - Address update failed:', addressUpdateResult.error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update address',
          error: addressUpdateResult.error
        });
      }
      
      console.log('✅ Backend - Address updated successfully');
    }

    // Get updated user data
    const getUserQuery = `
      SELECT id, email, user_type, first_name, last_name, phone, 
             date_of_birth, profile_image, is_active, email_verified, created_at
      FROM users WHERE id = ?
    `;
    const getUserResult = await executeQuery(getUserQuery, [userId]);

    if (!getUserResult.success || getUserResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found after update'
      });
    }

    const user = getUserResult.data[0];

    // Transform field names to match frontend expectations
    const transformedUser = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      dateOfBirth: user.date_of_birth,
      role: user.user_type,
      profileImage: user.profile_image,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    // Get patient profile if user is a patient (especially if address was updated)
    if (user.user_type === 'patient') {
      const profileQuery = 'SELECT * FROM patient_profiles WHERE user_id = ?';
      const profileResult = await executeQuery(profileQuery, [userId]);
      
      if (profileResult.success && profileResult.data.length > 0) {
        transformedUser.patientProfile = profileResult.data[0];
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: transformedUser
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload profile image
router.post('/upload-profile-image', authenticateToken, (req, res, next) => {
  console.log('🔍 Pre-multer middleware - Request headers:', req.headers);
  console.log('🔍 Pre-multer middleware - Content-Type:', req.headers['content-type']);
  next();
}, upload.any(), (err, req, res, next) => {
  if (err) {
    console.log('❌ Multer middleware error:', err);
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + err.message
    });
  }
  next();
}, async (req, res) => {
  try {
    console.log('🔍 Upload profile image endpoint called');
    console.log('🔍 Request headers:', req.headers);
    console.log('🔍 Request body:', req.body);
    console.log('🔍 Request file:', req.file);
    console.log('🔍 Request files:', req.files);
    console.log('🔍 Request user:', req.user);
    console.log('🔍 Content-Type:', req.headers['content-type']);
    console.log('🔍 Multer error:', req.fileValidationError);
    console.log('🔍 Multer errors:', req.fileValidationErrors);
    
    // Ensure user is authenticated
    if (!req.user) {
      console.log('❌ No authenticated user found');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check for files (using upload.any() now)
    if (!req.files || req.files.length === 0) {
      console.log('❌ No files received in request');
      console.log('🔍 Request body keys:', Object.keys(req.body || {}));
      console.log('🔍 Request headers:', req.headers);
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Get the first file (should be the profile image)
    const file = req.files[0];
    console.log('🔍 Processing file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      filename: file.filename
    });
    
    // Log all files received for debugging
    console.log('🔍 All files received:', req.files.map(f => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size
    })));

    const userId = req.user.id;
    const imagePath = file.path;
    const imageUrl = `/uploads/profile-images/${file.filename}`;

    // Update user's profile image in database
    const updateQuery = 'UPDATE users SET profile_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const updateResult = await executeQuery(updateQuery, [imageUrl, userId]);

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile image'
      });
    }

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        profileImage: imageUrl
      }
    });

  } catch (error) {
    console.error('❌ Upload profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update patient profile
router.put('/patient-profile', authenticateToken, [
  body('emergency_contact').optional().isString(),
  body('insurance_provider').optional().isString(),
  body('insurance_number').optional().isString(),
  body('blood_type').optional().isString(),
  body('allergies').optional().isString(),
  body('medical_history').optional().isString()
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
    const { emergency_contact, insurance_provider, insurance_number, blood_type, allergies, medical_history } = req.body;

    // Check if user is a patient
    const userQuery = 'SELECT user_type FROM users WHERE id = ?';
    const userResult = await executeQuery(userQuery, [userId]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (userResult.data[0].user_type !== 'patient') {
      return res.status(403).json({
        success: false,
        message: 'Only patients can update patient profile'
      });
    }

    // Check if patient profile exists
    const profileExistsQuery = 'SELECT id FROM patient_profiles WHERE user_id = ?';
    const profileExistsResult = await executeQuery(profileExistsQuery, [userId]);

    let updateResult;
    if (profileExistsResult.success && profileExistsResult.data.length > 0) {
      // Update existing profile - simplified query
      let updateQuery = 'UPDATE patient_profiles SET updated_at = CURRENT_TIMESTAMP';
      let params = [];
      
      if (emergency_contact !== undefined) {
        updateQuery += ', emergency_contact = ?';
        params.push(emergency_contact);
      }
      if (insurance_provider !== undefined) {
        updateQuery += ', insurance_provider = ?';
        params.push(insurance_provider);
      }
      if (insurance_number !== undefined) {
        updateQuery += ', insurance_number = ?';
        params.push(insurance_number);
      }
      if (blood_type !== undefined) {
        updateQuery += ', blood_type = ?';
        params.push(blood_type);
      }
      if (allergies !== undefined) {
        updateQuery += ', allergies = ?';
        params.push(allergies);
      }
      if (medical_history !== undefined) {
        updateQuery += ', medical_history = ?';
        params.push(medical_history);
      }
      
      updateQuery += ' WHERE user_id = ?';
      params.push(userId);
      
      console.log('🔍 Backend - Patient profile update query:', updateQuery);
      console.log('🔍 Backend - Patient profile update params:', params);
      
      updateResult = await executeQuery(updateQuery, params);
    } else {
      // Create new profile
      const insertQuery = `
        INSERT INTO patient_profiles (user_id, emergency_contact, insurance_provider, insurance_number, blood_type, allergies, medical_history)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      updateResult = await executeQuery(insertQuery, [
        userId, emergency_contact, insurance_provider, insurance_number, 
        blood_type, allergies, medical_history
      ]);
    }

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update patient profile'
      });
    }

    // Get updated patient profile data
    const getProfileQuery = 'SELECT * FROM patient_profiles WHERE user_id = ?';
    const getProfileResult = await executeQuery(getProfileQuery, [userId]);

    let updatedProfile = null;
    if (getProfileResult.success && getProfileResult.data.length > 0) {
      updatedProfile = getProfileResult.data[0];
    }

    res.json({
      success: true,
      message: 'Patient profile updated successfully',
      data: {
        patientProfile: updatedProfile
      }
    });

  } catch (error) {
    console.error('❌ Update patient profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
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
    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const passwordQuery = 'SELECT password_hash FROM users WHERE id = ?';
    const passwordResult = await executeQuery(passwordQuery, [userId]);

    if (!passwordResult.success || passwordResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, passwordResult.data[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updateQuery = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const updateResult = await executeQuery(updateQuery, [newPasswordHash, userId]);

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Forgot password - Generate and send OTP
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
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

    const { email } = req.body;

    // Check if user exists
    const userQuery = 'SELECT id, email, first_name FROM users WHERE email = ?';
    const userResult = await executeQuery(userQuery, [email]);

    if (!userResult.success || userResult.data.length === 0) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, an OTP has been sent to your email'
      });
    }

    const user = userResult.data[0];

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Invalidate any existing OTPs for this user
    const invalidateQuery = `
      UPDATE password_reset_otps 
      SET is_verified = TRUE 
      WHERE user_id = ? AND is_verified = FALSE AND expires_at > NOW()
    `;
    await executeQuery(invalidateQuery, [user.id]);

    // Store OTP in database
    const insertOTPQuery = `
      INSERT INTO password_reset_otps (user_id, email, otp_code, expires_at)
      VALUES (?, ?, ?, ?)
    `;
    const insertResult = await executeQuery(insertOTPQuery, [
      user.id,
      user.email,
      otpCode,
      expiresAt
    ]);

    if (!insertResult.success) {
      console.error('❌ Failed to store OTP in database');
      return res.status(500).json({
        success: false,
        message: 'Failed to generate OTP. Please try again.'
      });
    }

    // Send OTP via email
    console.log('📧 Forgot Password - Attempting to send OTP email...');
    console.log('📧 Forgot Password - User email:', user.email);
    console.log('📧 Forgot Password - User first name:', user.first_name);
    console.log('📧 Forgot Password - OTP Code:', otpCode);
    
    try {
      const { sendPasswordResetOTP } = require('../utils/emailService');
      console.log('📧 Forgot Password - Email service function loaded');
      
      const emailSent = await sendPasswordResetOTP(user.email, user.first_name, otpCode);
      
      if (emailSent) {
        console.log('✅ Password reset OTP sent successfully to:', user.email);
        console.log('🔑 OTP Code (for testing):', otpCode);
      } else {
        console.error('❌ Failed to send password reset OTP to:', user.email);
        console.error('❌ Email service returned false');
        // Still return success to not reveal if user exists
      }
    } catch (emailError) {
      console.error('❌ Error sending password reset OTP:', emailError);
      console.error('❌ Error type:', emailError?.constructor?.name);
      console.error('❌ Error message:', emailError?.message);
      console.error('❌ Error stack:', emailError?.stack);
      // Still return success to not reveal if user exists
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, an OTP has been sent to your email'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
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

    const { email, otp } = req.body;

    // Find valid OTP
    const otpQuery = `
      SELECT otp.id, otp.user_id, otp.otp_code, otp.expires_at, otp.attempts, otp.is_verified
      FROM password_reset_otps otp
      INNER JOIN users u ON otp.user_id = u.id
      WHERE u.email = ? AND otp.otp_code = ? AND otp.expires_at > NOW() AND otp.is_verified = FALSE
      ORDER BY otp.created_at DESC
      LIMIT 1
    `;
    const otpResult = await executeQuery(otpQuery, [email, otp]);

    if (!otpResult.success || otpResult.data.length === 0) {
      // Increment attempts if OTP exists but is wrong
      const wrongOTPQuery = `
        UPDATE password_reset_otps 
        SET attempts = attempts + 1
        WHERE email = ? AND expires_at > NOW() AND is_verified = FALSE
      `;
      await executeQuery(wrongOTPQuery, [email]);

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new one.'
      });
    }

    const otpRecord = otpResult.data[0];

    // Check if too many attempts (max 5)
    if (otpRecord.attempts >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Mark OTP as verified
    const verifyQuery = `
      UPDATE password_reset_otps 
      SET is_verified = TRUE, verified_at = NOW()
      WHERE id = ?
    `;
    await executeQuery(verifyQuery, [otpRecord.id]);

    // Generate verification token (valid for 15 minutes)
    const verificationToken = jwt.sign(
      { userId: otpRecord.user_id, email: email, type: 'password-reset', otpId: otpRecord.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        verificationToken
      }
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset password - Requires verified OTP token
router.post('/reset-password', [
  body('verificationToken').notEmpty(),
  body('newPassword').isLength({ min: 6 })
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

    const { verificationToken, newPassword } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(verificationToken, process.env.JWT_SECRET || 'fallback-secret');
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Verification token expired. Please verify OTP again.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid verification token'
      });
    }
    
    if (decoded.type !== 'password-reset') {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Verify that OTP was actually verified
    const otpCheckQuery = `
      SELECT is_verified FROM password_reset_otps WHERE id = ?
    `;
    const otpCheck = await executeQuery(otpCheckQuery, [decoded.otpId]);

    if (!otpCheck.success || otpCheck.data.length === 0 || !otpCheck.data[0].is_verified) {
      return res.status(401).json({
        success: false,
        message: 'OTP not verified. Please verify OTP first.'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updateQuery = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const updateResult = await executeQuery(updateQuery, [newPasswordHash, decoded.userId]);

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }

    // Invalidate all OTPs for this user
    const invalidateAllQuery = `
      UPDATE password_reset_otps 
      SET is_verified = TRUE 
      WHERE user_id = ?
    `;
    await executeQuery(invalidateAllQuery, [decoded.userId]);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];

    // Optional: Add token to blacklist (you can implement a blacklist table)
    // For now, we'll just return success and let the client handle token removal
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret');
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Check if user still exists
    const userQuery = 'SELECT id, email, user_type, first_name, last_name, phone, date_of_birth, is_active FROM users WHERE id = ?';
    const userResult = await executeQuery(userQuery, [decoded.userId]);

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.data[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate new tokens
    const newToken = generateToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user,
        token: newToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('❌ Refresh token error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Test OTP email endpoint (for debugging)
router.post('/test-otp-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    console.log('🧪 Test OTP Email - Starting test...');
    console.log('🧪 Test OTP Email - Email:', email);
    
    const { sendPasswordResetOTP } = require('../utils/emailService');
    const testOTP = '123456';
    const emailSent = await sendPasswordResetOTP(email, 'Test User', testOTP);

    if (emailSent) {
      console.log('✅ Test OTP Email - Email sent successfully');
      res.json({
        success: true,
        message: 'Test OTP email sent successfully',
        otp: testOTP,
        recipient: email
      });
    } else {
      console.error('❌ Test OTP Email - Email sending failed');
      res.status(500).json({
        success: false,
        message: 'Failed to send test OTP email. Check server logs for details.',
        recipient: email
      });
    }
  } catch (error) {
    console.error('❌ Test OTP Email - Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test OTP email',
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router; 