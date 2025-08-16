const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profile-images');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user.id;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `profile-${userId}-${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
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
  body('userType').isIn(['patient', 'doctor', 'pharmacist']),
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
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
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
router.post('/upload-profile-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const userId = req.user.id;
    const imagePath = req.file.path;
    const imageUrl = `/uploads/profile-images/${req.file.filename}`;

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

// Forgot password
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
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    const user = userResult.data[0];

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id, type: 'reset' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    // Store reset token in database (you can add a reset_token field to users table)
    // For now, we'll just return success

    // TODO: Send email with reset link
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // await sendEmail(user.email, 'Password Reset', `Click here to reset your password: ${resetLink}`);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset password
router.post('/reset-password', [
  body('token').notEmpty(),
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

    const { token, newPassword } = req.body;

    // Verify reset token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    if (decoded.type !== 'reset') {
      return res.status(401).json({
        success: false,
        message: 'Invalid reset token'
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

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid reset token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Reset token expired'
      });
    }

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

module.exports = router; 