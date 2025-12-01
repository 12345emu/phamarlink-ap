const express = require('express');
const { body, query, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { executeQuery } = require('../config/database');
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');
const { generateSecurePassword } = require('../utils/passwordGenerator');
const { sendPharmacyCredentials } = require('../utils/emailService');
const pushNotificationService = require('../services/pushNotificationService');
const { createNotification, getFacilityOwnerId } = require('../utils/notificationHelper');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine upload directory based on route
    let uploadDir;
    if (req.path.includes('/hospital/')) {
      uploadDir = path.join(__dirname, '../uploads/hospital-images');
    } else {
      uploadDir = path.join(__dirname, '../uploads/pharmacy-images');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const prefix = req.path.includes('/hospital/') ? 'hospital' : 'pharmacy';
    cb(null, `${prefix}-${timestamp}${ext}`);
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

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Facilities route is working' });
});

// Get all healthcare facilities with optional filtering
router.get('/', [
  query('type').optional().isIn(['pharmacy', 'hospital', 'clinic']),
  query('city').optional().trim(),
  query('search').optional().trim(),
  query('latitude').optional().isFloat(),
  query('longitude').optional().isFloat(),
  query('radius').optional().isFloat({ min: 0.1, max: 50 }), // km
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('page').optional().isInt({ min: 1 })
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

    const {
      type,
      city,
      search,
      latitude,
      longitude,
      radius = 10, // default 10km
      limit = 20,
      page = 1
    } = req.query;

    let whereConditions = ['is_active = TRUE'];
    let queryParams = [];
    let orderBy = '';

    // Filter by facility type
    if (type) {
      whereConditions.push('facility_type = ?');
      queryParams.push(type);
    }

    // Filter by city
    if (city) {
      whereConditions.push('city LIKE ?');
      queryParams.push(`%${city}%`);
    }

    // Search in name, description, services
    if (search) {
      whereConditions.push('(name LIKE ? OR description LIKE ? OR services LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    // Location-based search
    if (latitude && longitude) {
      // Calculate distance using Haversine formula
      const distanceFormula = `
        (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
         cos(radians(longitude) - radians(?)) + 
         sin(radians(?)) * sin(radians(latitude))))
      `;
      
      whereConditions.push(`${distanceFormula} <= ?`);
      queryParams.push(parseFloat(latitude), parseFloat(longitude), parseFloat(latitude), parseFloat(radius));
      
      // Order by distance
      orderBy = `ORDER BY ${distanceFormula.replace(/\?/g, '?')} ASC`;
      queryParams.push(parseFloat(latitude), parseFloat(longitude), parseFloat(latitude));
    } else {
      // Default ordering
      orderBy = 'ORDER BY rating DESC, total_reviews DESC, name ASC';
    }

    // Build the query
    const offset = (page - 1) * limit;
    const whereClause = whereConditions.join(' AND ');
    
    const facilitiesQuery = `
      SELECT 
        id, name, facility_type, address, city, state, country,
        latitude, longitude, phone, email, website, services,
        description, rating, total_reviews, is_verified,
        images, created_at
      FROM healthcare_facilities 
      WHERE ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    queryParams.push(parseInt(limit), offset);
    
    const facilitiesResult = await executeQuery(facilitiesQuery, queryParams);

    if (!facilitiesResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch facilities'
      });
    }

    // Parse JSON fields for each facility
    facilitiesResult.data.forEach(facility => {
      if (facility.services) {
        try {
          // Check if it's already an array (already parsed)
          if (typeof facility.services === 'string') {
            facility.services = JSON.parse(facility.services);
          }
        } catch (error) {
          console.log(`❌ Error parsing services for facility ${facility.id}:`, error.message);
          // If parsing fails, set to empty array
          facility.services = [];
        }
      }
      if (facility.images) {
        try {
          // Check if it's already an array (already parsed)
          if (typeof facility.images === 'string') {
            facility.images = JSON.parse(facility.images);
          }
        } catch (error) {
          console.log(`❌ Error parsing images for facility ${facility.id}:`, error.message);
          // If parsing fails, set to empty array
          facility.images = [];
        }
      }
    });

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM healthcare_facilities 
      WHERE ${whereClause}
    `;
    
    const countResult = await executeQuery(countQuery, queryParams.slice(0, -2));
    const total = countResult.success ? countResult.data[0].total : 0;

    res.json({
      success: true,
      data: {
        facilities: facilitiesResult.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Get facilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get nearby facilities (location-based)
router.get('/nearby', [
  query('latitude').isFloat(),
  query('longitude').isFloat(),
  query('radius').optional().isFloat({ min: 0.1, max: 50 }),
  query('type').optional().isIn(['pharmacy', 'hospital', 'clinic']),
  query('limit').optional().isInt({ min: 1, max: 50 })
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

    const {
      latitude,
      longitude,
      radius = 5, // default 5km
      type,
      limit = 20
    } = req.query;

    let whereConditions = ['is_active = TRUE'];
    let queryParams = [];

    // Filter by facility type
    if (type) {
      whereConditions.push('facility_type = ?');
      queryParams.push(type);
    }

    const whereClause = whereConditions.join(' AND ');

    // Use Haversine formula to calculate distance
    const nearbyQuery = `
      SELECT 
        id, name, facility_type, address, city, state, country,
        latitude, longitude, phone, rating, total_reviews, services, images,
        (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
         cos(radians(longitude) - radians(?)) + 
         sin(radians(?)) * sin(radians(latitude)))) AS distance_km
      FROM healthcare_facilities 
      WHERE ${whereClause}
      HAVING distance_km <= ?
      ORDER BY distance_km ASC
      LIMIT ?
    `;

    // Add parameters in the correct order: latitude, longitude, latitude (for sin), radius, limit
    queryParams.push(parseFloat(latitude), parseFloat(longitude), parseFloat(latitude), parseFloat(radius), parseInt(limit));
    
    console.log('🔍 Nearby search parameters:', {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseFloat(radius),
      limit: parseInt(limit)
    });
    
    const nearbyResult = await executeQuery(nearbyQuery, queryParams);

    if (!nearbyResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch nearby facilities'
      });
    }

    console.log(`✅ Found ${nearbyResult.data.length} facilities within ${radius}km`);
    console.log('🔍 Distance debugging:');
    nearbyResult.data.forEach((facility, index) => {
      console.log(`${index + 1}. ${facility.name}: distance = ${facility.distance_km} km`);
    });

    // Parse JSON fields for each facility
    nearbyResult.data.forEach(facility => {
      if (facility.services) {
        try {
          // Check if it's already an array (already parsed)
          if (typeof facility.services === 'string') {
            facility.services = JSON.parse(facility.services);
          }
        } catch (error) {
          console.log(`❌ Error parsing services for facility ${facility.id}:`, error.message);
          // If parsing fails, keep as string or set to empty array
          facility.services = [];
        }
      }
      if (facility.images) {
        try {
          // Check if it's already an array (already parsed)
          if (typeof facility.images === 'string') {
            facility.images = JSON.parse(facility.images);
          }
        } catch (error) {
          console.log(`❌ Error parsing images for facility ${facility.id}:`, error.message);
          // If parsing fails, set to empty array
          facility.images = [];
        }
      }
    });

    res.json({
      success: true,
      data: {
        facilities: nearbyResult.data,
        search_location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseFloat(radius)
        }
      }
    });

  } catch (error) {
    console.error('❌ Get nearby facilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get facility medicines (for pharmacies)
router.get('/:id/medicines', async (req, res) => {
  try {
    const facilityId = req.params.id;

    // Check if facility exists and is a pharmacy
    const facilityQuery = `
      SELECT id, name, facility_type 
      FROM healthcare_facilities 
      WHERE id = ? AND is_active = TRUE
    `;
    
    const facilityResult = await executeQuery(facilityQuery, [facilityId]);

    if (!facilityResult.success || facilityResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    const facility = facilityResult.data[0];

    // Check if facility can have medicines (pharmacies, hospitals, clinics)
    if (!['pharmacy', 'hospital', 'clinic'].includes(facility.facility_type)) {
      return res.status(400).json({
        success: false,
        message: 'This facility does not sell medicines'
      });
    }

    // Get medicines for this facility
    // Check both pharmacy_id and facility_id columns (some tables might use one or the other)
    // Also check for medicines regardless of is_available status (we'll filter in frontend if needed)
    const medicinesQuery = `
      SELECT 
        m.id, m.name, m.generic_name, m.category, m.prescription_required,
        m.dosage_form, m.strength, m.description, m.manufacturer,
        pm.stock_quantity,
        pm.price,
        pm.discount_price,
        pm.is_available,
        pm.id as pharmacy_medicine_id,
        pm.expiry_date,
        pm.batch_number
      FROM medicines m
      INNER JOIN pharmacy_medicines pm ON m.id = pm.medicine_id
      WHERE (pm.pharmacy_id = ? OR pm.facility_id = ?) 
        AND (m.is_active = TRUE OR m.is_active = 1)
      ORDER BY m.category, m.name
    `;
    
    console.log(`🔍 Fetching medicines for facility_id: ${facilityId}`);
    const medicinesResult = await executeQuery(medicinesQuery, [facilityId, facilityId]);
    
    if (!medicinesResult.success) {
      console.error('❌ Medicines query failed:', medicinesResult.error);
    } else {
      console.log(`✅ Medicines query result: ${medicinesResult.data?.length || 0} medicines found`);
      if (medicinesResult.data && medicinesResult.data.length > 0) {
        console.log('📋 Sample medicine:', JSON.stringify(medicinesResult.data[0], null, 2));
      }
    }

    if (!medicinesResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch medicines'
      });
    }

    // Group medicines by category
    const medicinesByCategory = {};
    medicinesResult.data.forEach(medicine => {
      if (!medicinesByCategory[medicine.category]) {
        medicinesByCategory[medicine.category] = [];
      }
      medicinesByCategory[medicine.category].push({
        id: medicine.id,
        name: medicine.name,
        generic_name: medicine.generic_name,
        category: medicine.category,
        prescription_required: medicine.prescription_required === 1,
        dosage_form: medicine.dosage_form,
        strength: medicine.strength,
        description: medicine.description,
        manufacturer: medicine.manufacturer,
        stock_quantity: medicine.stock_quantity,
        price: parseFloat(medicine.price),
        discount_price: medicine.discount_price ? parseFloat(medicine.discount_price) : null,
        is_available: medicine.is_available === 1,
        pharmacy_medicine_id: medicine.pharmacy_medicine_id,
        expiry_date: medicine.expiry_date || null,
        batch_number: medicine.batch_number || null
      });
    });

    res.json({
      success: true,
      data: {
        facility: {
          id: facility.id,
          name: facility.name,
          type: facility.facility_type
        },
        medicines_by_category: medicinesByCategory,
        total_medicines: medicinesResult.data.length
      }
    });

  } catch (error) {
    console.error('❌ Get facility medicines error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Pharmacy Registration
router.post('/pharmacy/register', upload.array('images', 5), [
  body('pharmacyName').trim().isLength({ min: 2, max: 100 }),
  body('ownerName').trim().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').matches(/^(\+233|0)[0-9]{9}$/).withMessage('Phone number must be a valid Ghana phone number'),
  body('address').trim().isLength({ min: 5, max: 500 }),
  body('city').trim().isLength({ min: 2, max: 100 }),
  body('region').optional().trim().isLength({ min: 2, max: 100 }),
  body('postalCode').optional().trim().isLength({ min: 3, max: 20 }),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('licenseNumber').trim().isLength({ min: 3, max: 50 }),
  body('registrationNumber').optional().trim().isLength({ min: 3, max: 50 }),
  body('services').optional().isArray(),
  body('operatingHours').optional().trim().isLength({ max: 200 }),
  body('emergencyContact').optional().trim().matches(/^(\+233|0)[0-9]{9}$/).withMessage('Emergency contact must be a valid Ghana phone number'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('acceptsInsurance').optional().isIn(['true', 'false', '1', '0', true, false, 1, 0]),
  body('hasDelivery').optional().isIn(['true', 'false', '1', '0', true, false, 1, 0]),
  body('hasConsultation').optional().isIn(['true', 'false', '1', '0', true, false, 1, 0]),
  body('userId').optional().isString().isLength({ min: 1 }),
], async (req, res) => {
  try {
    // Debug: Log the received data
    console.log('🔍 Pharmacy registration request received:');
    console.log('Body:', req.body);
    console.log('Files:', req.files ? req.files.length : 0);
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      pharmacyName,
      ownerName,
      email,
      phone,
      address,
      city,
      region,
      postalCode,
      latitude,
      longitude,
      licenseNumber,
      registrationNumber,
      services,
      operatingHours,
      emergencyContact,
      description,
      acceptsInsurance,
      hasDelivery,
      hasConsultation,
      userId
    } = req.body;

    // Convert boolean strings to actual booleans
    const acceptsInsuranceBool = acceptsInsurance === 'true' || acceptsInsurance === '1' || acceptsInsurance === true || acceptsInsurance === 1;
    const hasDeliveryBool = hasDelivery === 'true' || hasDelivery === '1' || hasDelivery === true || hasDelivery === 1;
    const hasConsultationBool = hasConsultation === 'true' || hasConsultation === '1' || hasConsultation === true || hasConsultation === 1;
    
    console.log('🔍 Boolean values:', {
      acceptsInsurance,
      acceptsInsuranceType: typeof acceptsInsurance,
      acceptsInsuranceBool,
      hasDelivery,
      hasDeliveryType: typeof hasDelivery,
      hasDeliveryBool,
      hasConsultation,
      hasConsultationType: typeof hasConsultation,
      hasConsultationBool,
      userId,
      userIdType: typeof userId
    });
    
    console.log('🔍 Full request body:', req.body);

    // Check if pharmacy with same license number already exists
    const existingLicenseQuery = 'SELECT id FROM healthcare_facilities WHERE license_number = ? AND facility_type = "pharmacy"';
    const existingLicenseResult = await executeQuery(existingLicenseQuery, [licenseNumber]);
    
    if (existingLicenseResult.success && existingLicenseResult.data.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A pharmacy with this license number already exists'
      });
    }

    // Check if email is already registered
    const existingEmailQuery = 'SELECT id FROM healthcare_facilities WHERE email = ? AND facility_type = "pharmacy"';
    const existingEmailResult = await executeQuery(existingEmailQuery, [email]);
    
    if (existingEmailResult.success && existingEmailResult.data.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A pharmacy with this email already exists'
      });
    }

    // Process uploaded images
    const imageUrls = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const imageUrl = `/uploads/pharmacy-images/${file.filename}`;
        imageUrls.push(imageUrl);
      });
    }

    // Handle user creation/update
    let finalUserId = userId;
    let emailSent = false;
    let emailError = null;
    
    // Check if user exists with this email
    const existingUserQuery = 'SELECT id, user_type FROM users WHERE email = ?';
    const existingUserResult = await executeQuery(existingUserQuery, [email]);
    
    if (existingUserResult.success && existingUserResult.data.length > 0) {
      // User exists - update user_type to facility-admin
      const existingUser = existingUserResult.data[0];
      finalUserId = existingUser.id;
      
      const updateUserQuery = 'UPDATE users SET user_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      const updateResult = await executeQuery(updateUserQuery, ['facility-admin', finalUserId]);
      
      if (updateResult.success) {
        console.log('✅ Updated existing user to facility-admin:', finalUserId);
        console.log('ℹ️  User already exists - credentials email not sent (user should use existing credentials)');
      } else {
        console.error('⚠️ Failed to update user type:', updateResult.error);
      }
    } else {
      // User doesn't exist - create new user
      const { password, hash } = await generateSecurePassword();
      console.log('🔐 Generated password for new facility-admin user');
      
      // Extract first name and last name from ownerName
      const nameParts = ownerName.trim().split(' ');
      const firstName = nameParts[0] || ownerName;
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const createUserQuery = `
        INSERT INTO users (email, password_hash, user_type, first_name, last_name, phone, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      const createUserResult = await executeQuery(createUserQuery, [
        email,
        hash,
        'facility-admin',
        firstName,
        lastName,
        phone
      ]);
      
      if (!createUserResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account'
        });
      }
      
      finalUserId = createUserResult.data.insertId;
      console.log('✅ Created new facility-admin user:', finalUserId);
      
      // Send credentials email to new user
      try {
        console.log('📧 Attempting to send pharmacy credentials email to:', email);
        console.log('📧 Email details:', {
          email,
          ownerName,
          pharmacyName,
          passwordLength: password.length
        });
        
        emailSent = await sendPharmacyCredentials(email, ownerName, pharmacyName, password);
        
        if (emailSent) {
          console.log('✅ Pharmacy credentials email sent successfully to:', email);
          console.log('✅ Email message ID logged above');
        } else {
          console.log('⚠️ Failed to send pharmacy credentials email to:', email);
          console.log('⚠️ sendPharmacyCredentials returned false');
          emailError = 'Email service returned false';
        }
      } catch (err) {
        console.error('❌ Error sending pharmacy credentials email:', err);
        console.error('❌ Error stack:', err.stack);
        console.error('❌ Error details:', {
          message: err.message,
          code: err.code,
          command: err.command
        });
        emailError = err.message || 'Unknown email error';
        // Don't fail the registration if email fails
      }
    }

    // Insert pharmacy into database
    const insertQuery = `
      INSERT INTO healthcare_facilities (
        user_id, name, facility_type, owner_name, address, city, state, postal_code, 
        latitude, longitude, license_number, registration_number, phone, email,
        operating_hours, emergency_contact, services, description, 
        accepts_insurance, has_delivery, has_consultation, images, is_active, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, FALSE)
    `;

    const insertParams = [
      finalUserId || null,
      pharmacyName,
      'pharmacy',
      ownerName,
      address,
      city,
      region || null,
      postalCode || null,
      latitude || null,
      longitude || null,
      licenseNumber,
      registrationNumber || null,
      phone,
      email,
      operatingHours ? JSON.stringify(operatingHours) : null,
      emergencyContact || null,
      services ? JSON.stringify(services) : null,
      description || null,
      acceptsInsuranceBool,
      hasDeliveryBool,
      hasConsultationBool,
      imageUrls.length > 0 ? JSON.stringify(imageUrls) : null
    ];

    const insertResult = await executeQuery(insertQuery, insertParams);

    if (!insertResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to register pharmacy'
      });
    }

    const pharmacyId = insertResult.data.insertId;

    // Get the created pharmacy data
    const getPharmacyQuery = `
      SELECT id, user_id, name, facility_type, owner_name, address, city, state, postal_code,
             latitude, longitude, license_number, registration_number, phone, email,
             operating_hours, emergency_contact, services, description,
             accepts_insurance, has_delivery, has_consultation, images,
             is_active, is_verified, created_at
      FROM healthcare_facilities 
      WHERE id = ?
    `;

    const pharmacyResult = await executeQuery(getPharmacyQuery, [pharmacyId]);

    if (!pharmacyResult.success || pharmacyResult.data.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve pharmacy data'
      });
    }

    const pharmacy = pharmacyResult.data[0];

    // Parse JSON fields
    if (pharmacy.services) {
      pharmacy.services = JSON.parse(pharmacy.services);
    }
    if (pharmacy.images) {
      pharmacy.images = JSON.parse(pharmacy.images);
    }

    // Build response message based on email status
    let responseMessage = 'Pharmacy registration submitted successfully. We will review your application and contact you within 3-5 business days.';
    
    if (emailSent) {
      responseMessage += ' Your login credentials have been sent to your email address. Please check your inbox and spam folder.';
    } else if (emailError) {
      console.log('⚠️  Registration succeeded but email failed - user may need manual credential delivery');
      responseMessage += ' Note: We encountered an issue sending your credentials email. Please contact support for your login credentials.';
    } else {
      // User already exists
      responseMessage += ' Please use your existing account credentials to log in.';
    }

    res.status(201).json({
      success: true,
      message: responseMessage,
      data: {
        pharmacy,
        emailSent: emailSent,
        emailError: emailError || null
      }
    });

  } catch (error) {
    console.error('❌ Pharmacy registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Hospital Registration
router.post('/hospital/register', upload.array('images', 5), [
  body('hospitalName').trim().isLength({ min: 2, max: 100 }).withMessage('Hospital name must be between 2 and 100 characters'),
  body('administratorName').trim().isLength({ min: 2, max: 100 }).withMessage('Administrator name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email address'),
  body('phone').matches(/^(\+233|0)[0-9]{9}$/).withMessage('Phone number must be a valid Ghana phone number'),
  body('address').trim().isLength({ min: 5, max: 500 }).withMessage('Address must be between 5 and 500 characters'),
  body('city').trim().isLength({ min: 2, max: 100 }).withMessage('City must be between 2 and 100 characters'),
  body('region').optional().trim().isLength({ min: 2, max: 100 }),
  body('postalCode').optional().trim().isLength({ min: 3, max: 20 }),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be a valid number between -90 and 90'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be a valid number between -180 and 180'),
  body('licenseNumber').trim().isLength({ min: 3, max: 50 }).withMessage('License number must be between 3 and 50 characters'),
  body('registrationNumber').optional().trim().isLength({ min: 3, max: 50 }),
  body('specialties').optional().isArray().withMessage('Specialties must be an array'),
  body('bedCapacity').optional().isInt({ min: 1 }).withMessage('Bed capacity must be a positive number'),
  body('emergencyContact').optional().trim().matches(/^(\+233|0)[0-9]{9}$/).withMessage('Emergency contact must be a valid Ghana phone number'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('hasEmergency').optional().isIn(['true', 'false', '1', '0', true, false, 1, 0]),
  body('hasICU').optional().isIn(['true', 'false', '1', '0', true, false, 1, 0]),
  body('hasAmbulance').optional().isIn(['true', 'false', '1', '0', true, false, 1, 0]),
  body('acceptsInsurance').optional().isIn(['true', 'false', '1', '0', true, false, 1, 0]),
  body('userId').optional().notEmpty().withMessage('User ID is required'),
], async (req, res) => {
  try {
    // Debug: Log the received data
    console.log('🔍 Hospital registration request received:');
    console.log('Body:', req.body);
    console.log('Files:', req.files ? req.files.length : 0);
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      hospitalName,
      administratorName,
      email,
      phone,
      address,
      city,
      region,
      postalCode,
      latitude,
      longitude,
      licenseNumber,
      registrationNumber,
      specialties,
      bedCapacity,
      emergencyContact,
      description,
      hasEmergency,
      hasICU,
      hasAmbulance,
      acceptsInsurance,
      userId
    } = req.body;

    // Convert boolean strings to actual booleans
    const hasEmergencyBool = hasEmergency === 'true' || hasEmergency === '1' || hasEmergency === true || hasEmergency === 1;
    const hasICUBool = hasICU === 'true' || hasICU === '1' || hasICU === true || hasICU === 1;
    const hasAmbulanceBool = hasAmbulance === 'true' || hasAmbulance === '1' || hasAmbulance === true || hasAmbulance === 1;
    const acceptsInsuranceBool = acceptsInsurance === 'true' || acceptsInsurance === '1' || acceptsInsurance === true || acceptsInsurance === 1;
    
    // Convert coordinates to numbers if they're strings
    const latitudeNum = latitude ? parseFloat(latitude) : null;
    const longitudeNum = longitude ? parseFloat(longitude) : null;
    
    console.log('🔍 Location data received:', {
      latitude,
      longitude,
      latitudeNum,
      longitudeNum,
      address,
      city,
      region,
      postalCode,
      latitudeType: typeof latitude,
      longitudeType: typeof longitude
    });
    
    console.log('🔍 Boolean values:', {
      hasEmergency,
      hasEmergencyType: typeof hasEmergency,
      hasEmergencyBool,
      hasICU,
      hasICUType: typeof hasICU,
      hasICUBool,
      hasAmbulance,
      hasAmbulanceType: typeof hasAmbulance,
      hasAmbulanceBool,
      acceptsInsurance,
      acceptsInsuranceType: typeof acceptsInsurance,
      acceptsInsuranceBool,
      userId,
      userIdType: typeof userId
    });

    // Check if hospital with same license number already exists
    const existingLicenseQuery = 'SELECT id FROM healthcare_facilities WHERE license_number = ? AND facility_type = "hospital"';
    const existingLicenseResult = await executeQuery(existingLicenseQuery, [licenseNumber]);
    
    if (existingLicenseResult.success && existingLicenseResult.data.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A hospital with this license number already exists'
      });
    }

    // Check if email is already registered
    const existingEmailQuery = 'SELECT id FROM healthcare_facilities WHERE email = ? AND facility_type = "hospital"';
    const existingEmailResult = await executeQuery(existingEmailQuery, [email]);
    
    if (existingEmailResult.success && existingEmailResult.data.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A hospital with this email address already exists'
      });
    }

    // Process uploaded images
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = req.files.map(file => `/uploads/hospital-images/${file.filename}`);
    }

    // Handle user creation/update
    let finalUserId = userId;
    
    // Check if user exists with this email
    const existingUserQuery = 'SELECT id, user_type FROM users WHERE email = ?';
    const existingUserResult = await executeQuery(existingUserQuery, [email]);
    
    if (existingUserResult.success && existingUserResult.data.length > 0) {
      // User exists - update user_type to facility-admin
      const existingUser = existingUserResult.data[0];
      finalUserId = existingUser.id;
      
      const updateUserQuery = 'UPDATE users SET user_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      const updateResult = await executeQuery(updateUserQuery, ['facility-admin', finalUserId]);
      
      if (updateResult.success) {
        console.log('✅ Updated existing user to facility-admin:', finalUserId);
      } else {
        console.error('⚠️ Failed to update user type:', updateResult.error);
      }
    } else {
      // User doesn't exist - create new user
      const { password, hash } = await generateSecurePassword();
      console.log('🔐 Generated password for new facility-admin user');
      
      // Extract first name and last name from administratorName
      const nameParts = administratorName.trim().split(' ');
      const firstName = nameParts[0] || administratorName;
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const createUserQuery = `
        INSERT INTO users (email, password_hash, user_type, first_name, last_name, phone, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      const createUserResult = await executeQuery(createUserQuery, [
        email,
        hash,
        'facility-admin',
        firstName,
        lastName,
        phone
      ]);
      
      if (!createUserResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account'
        });
      }
      
      finalUserId = createUserResult.data.insertId;
      console.log('✅ Created new facility-admin user:', finalUserId);
    }

    // Prepare services array (combine specialties and other services)
    const servicesArray = [];
    if (specialties && Array.isArray(specialties)) {
      servicesArray.push(...specialties);
    }
    if (hasEmergencyBool) servicesArray.push('Emergency Services');
    if (hasICUBool) servicesArray.push('ICU');
    if (hasAmbulanceBool) servicesArray.push('Ambulance Services');
    if (acceptsInsuranceBool) servicesArray.push('Insurance Accepted');

    // Create operating hours JSON
    const operatingHours = {
      monday: { open: '08:00', close: '18:00', isOpen: true },
      tuesday: { open: '08:00', close: '18:00', isOpen: true },
      wednesday: { open: '08:00', close: '18:00', isOpen: true },
      thursday: { open: '08:00', close: '18:00', isOpen: true },
      friday: { open: '08:00', close: '18:00', isOpen: true },
      saturday: { open: '09:00', close: '17:00', isOpen: true },
      sunday: { open: '09:00', close: '17:00', isOpen: true }
    };

    // Insert hospital into database
    const insertHospitalQuery = `
      INSERT INTO healthcare_facilities (
        user_id, name, facility_type, owner_name, address, city, state, postal_code,
        latitude, longitude, license_number, registration_number, phone, email,
        operating_hours, emergency_contact, services, description, bed_capacity,
        has_emergency, has_icu, has_ambulance, accepts_insurance, images,
        is_active, is_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const insertParams = [
      finalUserId || null,
      hospitalName,
      'hospital',
      administratorName,
      address,
      city,
      region || '',
      postalCode || '',
      latitudeNum,
      longitudeNum,
      licenseNumber,
      registrationNumber || '',
      phone,
      email,
      JSON.stringify(operatingHours),
      emergencyContact || '',
      JSON.stringify(servicesArray),
      description || '',
      bedCapacity || null,
      hasEmergencyBool,
      hasICUBool,
      hasAmbulanceBool,
      acceptsInsuranceBool,
      JSON.stringify(imageUrls),
      true,
      false
    ];

    console.log('🔍 Inserting hospital with params:', insertParams);
    console.log('🔍 Location params being inserted:', {
      latitude: insertParams[9], // latitude is at index 9
      longitude: insertParams[10], // longitude is at index 10
      address: insertParams[4], // address is at index 4
      city: insertParams[5], // city is at index 5
      region: insertParams[6], // region/state is at index 6
      postalCode: insertParams[7] // postal code is at index 7
    });

    const insertResult = await executeQuery(insertHospitalQuery, insertParams);

    if (!insertResult.success) {
      console.error('❌ Hospital insertion failed:', insertResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to register hospital'
      });
    }

    const hospitalId = insertResult.data.insertId;
    console.log('✅ Hospital registered successfully with ID:', hospitalId);

    // Get the created hospital data
    const getHospitalQuery = `
      SELECT id, user_id, name, facility_type, owner_name, address, city, state, postal_code,
             latitude, longitude, license_number, registration_number, phone, email,
             operating_hours, emergency_contact, services, description, bed_capacity,
             has_emergency, has_icu, has_ambulance, accepts_insurance, images,
             is_active, is_verified, created_at
      FROM healthcare_facilities 
      WHERE id = ?
    `;

    const hospitalResult = await executeQuery(getHospitalQuery, [hospitalId]);

    if (!hospitalResult.success || hospitalResult.data.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve hospital data'
      });
    }

    const hospital = hospitalResult.data[0];

    console.log('🔍 Hospital data retrieved from database:', {
      id: hospital.id,
      name: hospital.name,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      address: hospital.address,
      city: hospital.city,
      state: hospital.state,
      postal_code: hospital.postal_code
    });

    // Parse JSON fields
    if (hospital.services) {
      hospital.services = JSON.parse(hospital.services);
    }
    if (hospital.images) {
      hospital.images = JSON.parse(hospital.images);
    }

    res.status(201).json({
      success: true,
      message: 'Hospital registration submitted successfully. We will review your application and contact you within 3-5 business days.',
      data: {
        hospital
      }
    });

  } catch (error) {
    console.error('❌ Hospital registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get my facilities (for facility-admin users)
router.get('/my-facilities', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.user_type;

    console.log('🔍 Get my facilities - User ID:', userId, 'Type:', typeof userId);
    console.log('🔍 Get my facilities - User Role:', userRole);
    console.log('🔍 Get my facilities - Full user object:', JSON.stringify(req.user, null, 2));

    // Only facility-admin can access this endpoint
    if (userRole !== 'facility-admin') {
      console.log('❌ Get my facilities - Access denied, user role is:', userRole);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only facility administrators can access this endpoint.'
      });
    }

    // Convert userId to integer to ensure type matching
    const userIdInt = parseInt(userId, 10);
    console.log('🔍 Get my facilities - Converted user ID to integer:', userIdInt);

    // First, let's check if there are any facilities with this user_id (for debugging)
    // Check without is_active filter first
    const debugQuery = 'SELECT id, name, user_id, facility_type, is_active FROM healthcare_facilities WHERE user_id = ?';
    const debugResult = await executeQuery(debugQuery, [userIdInt]);
    console.log('🔍 Get my facilities - Debug query (all facilities for user):', JSON.stringify(debugResult, null, 2));
    
    // Also check if user_id might be stored as string
    const debugQueryString = 'SELECT id, name, user_id, facility_type, is_active FROM healthcare_facilities WHERE CAST(user_id AS CHAR) = ?';
    const debugResultString = await executeQuery(debugQueryString, [userId.toString()]);
    console.log('🔍 Get my facilities - Debug query (string comparison):', JSON.stringify(debugResultString, null, 2));
    
    // Check all facilities to see what user_ids exist
    const allFacilitiesQuery = 'SELECT id, name, user_id, facility_type FROM healthcare_facilities LIMIT 10';
    const allFacilitiesResult = await executeQuery(allFacilitiesQuery, []);
    console.log('🔍 Get my facilities - Sample facilities in database:', JSON.stringify(allFacilitiesResult, null, 2));

    const query = `
      SELECT 
        id, name, facility_type, address, city, state, country,
        latitude, longitude, phone, email, website, operating_hours,
        services, description, rating, total_reviews, is_verified,
        images, license_number, registration_number, owner_name,
        is_active, created_at, updated_at, user_id
      FROM healthcare_facilities 
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY created_at DESC
    `;
    
    console.log('🔍 Get my facilities - Executing query with user_id:', userIdInt);
    const result = await executeQuery(query, [userIdInt]);
    console.log('🔍 Get my facilities - Query result:', {
      success: result.success,
      dataLength: result.data ? result.data.length : 0,
      error: result.error
    });

    if (!result.success) {
      console.error('❌ Get my facilities - Query failed:', result.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch facilities',
        error: result.error
      });
    }

    console.log('🔍 Get my facilities - Raw facilities data:', JSON.stringify(result.data, null, 2));

    // Parse JSON fields
    const facilities = result.data.map(facility => {
      if (facility.services && typeof facility.services === 'string') {
        try {
          facility.services = JSON.parse(facility.services);
        } catch (error) {
          console.error('❌ Error parsing services:', error);
          facility.services = [];
        }
      }
      if (facility.images && typeof facility.images === 'string') {
        try {
          facility.images = JSON.parse(facility.images);
        } catch (error) {
          console.error('❌ Error parsing images:', error);
          facility.images = [];
        }
      }
      return facility;
    });

    console.log('✅ Get my facilities - Returning', facilities.length, 'facilities');

    res.json({
      success: true,
      data: facilities,
      message: 'Facilities fetched successfully'
    });

  } catch (error) {
    console.error('❌ Get my facilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get facility by ID
router.get('/:id', async (req, res) => {
  try {
    const facilityId = req.params.id;

    // Get facility details
    const facilityQuery = `
      SELECT 
        id, name, facility_type, address, city, state, country,
        latitude, longitude, phone, email, website, operating_hours,
        services, description, rating, total_reviews, is_verified,
        images, created_at, accepts_insurance, has_delivery, has_consultation,
        emergency_contact, is_active, postal_code, updated_at
      FROM healthcare_facilities 
      WHERE id = ? AND is_active = TRUE
    `;
    
    const facilityResult = await executeQuery(facilityQuery, [facilityId]);

    if (!facilityResult.success || facilityResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    const facility = facilityResult.data[0];

    console.log('🔍 Raw facility data from database:', {
      id: facility.id,
      name: facility.name,
      images: facility.images,
      imagesType: typeof facility.images
    });

    // Parse JSON fields
    if (facility.services) {
      try {
        // Check if it's already an array (already parsed)
        if (typeof facility.services === 'string') {
          facility.services = JSON.parse(facility.services);
        }
      } catch (error) {
        console.log(`❌ Error parsing services for facility ${facility.id}:`, error.message);
        // If parsing fails, set to empty array
        facility.services = [];
      }
    }
    if (facility.images) {
      try {
        // Check if it's already an array (already parsed)
        if (typeof facility.images === 'string') {
          facility.images = JSON.parse(facility.images);
        }
      } catch (error) {
        console.log(`❌ Error parsing images for facility ${facility.id}:`, error.message);
        // If parsing fails, set to empty array
        facility.images = [];
      }
    }

    console.log('🔍 Parsed facility data:', {
      id: facility.id,
      name: facility.name,
      images: facility.images,
      imagesType: typeof facility.images,
      accepts_insurance: facility.accepts_insurance,
      accepts_insurance_type: typeof facility.accepts_insurance,
      has_delivery: facility.has_delivery,
      has_delivery_type: typeof facility.has_delivery,
      has_consultation: facility.has_consultation,
      has_consultation_type: typeof facility.has_consultation
    });

    // Get reviews for this facility
    const reviewsQuery = `
      SELECT r.id, r.rating, r.review_text, r.review_type, r.created_at,
             u.first_name, u.last_name, u.user_type
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.facility_id = ? AND r.is_verified = TRUE
      ORDER BY r.created_at DESC
      LIMIT 10
    `;
    
    const reviewsResult = await executeQuery(reviewsQuery, [facilityId]);
    if (reviewsResult.success) {
      facility.reviews = reviewsResult.data;
    }

    // If it's a facility that can have medicines, get available medicines
    if (['pharmacy', 'hospital', 'clinic'].includes(facility.facility_type)) {
      const medicinesQuery = `
        SELECT 
          m.id, m.name, m.generic_name, m.brand_name, m.description,
          m.category, m.prescription_required, m.dosage_form, m.strength,
          COALESCE(pm.stock_quantity, 50) as stock_quantity,
          COALESCE(pm.price, 45.00) as price,
          pm.discount_price,
          COALESCE(pm.is_available, TRUE) as is_available
        FROM medicines m
        LEFT JOIN pharmacy_medicines pm ON m.id = pm.medicine_id AND pm.facility_id = m.facility_id
        WHERE m.facility_id = ? AND m.is_active = TRUE
        ORDER BY m.name ASC
      `;
      
      const medicinesResult = await executeQuery(medicinesQuery, [facilityId]);
      if (medicinesResult.success) {
        facility.available_medicines = medicinesResult.data;
      }
    }

    res.json({
      success: true,
      data: facility
    });

  } catch (error) {
    console.error('❌ Get facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add review for a facility (authenticated users only)
router.post('/:id/reviews', [
  authenticateToken,
  body('rating').isInt({ min: 1, max: 5 }),
  body('reviewText').optional().trim().isLength({ min: 10, max: 1000 }),
  body('reviewType').isIn(['facility', 'doctor', 'medicine', 'service'])
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

    const facilityId = req.params.id;
    const userId = req.user.id;
    const { rating, reviewText, reviewType } = req.body;

    // Check if facility exists
    const facilityQuery = 'SELECT id FROM healthcare_facilities WHERE id = ? AND is_active = TRUE';
    const facilityResult = await executeQuery(facilityQuery, [facilityId]);

    if (!facilityResult.success || facilityResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Check if user already reviewed this facility
    const existingReviewQuery = 'SELECT id FROM reviews WHERE user_id = ? AND facility_id = ?';
    const existingReviewResult = await executeQuery(existingReviewQuery, [userId, facilityId]);

    if (existingReviewResult.success && existingReviewResult.data.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this facility'
      });
    }

    // Insert review
    const insertReviewQuery = `
      INSERT INTO reviews (user_id, facility_id, rating, review_text, review_type)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const insertResult = await executeQuery(insertReviewQuery, [
      userId, facilityId, rating, reviewText, reviewType
    ]);

    if (!insertResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to add review'
      });
    }

    // Update facility rating
    const updateRatingQuery = `
      UPDATE healthcare_facilities 
      SET rating = (
        SELECT AVG(rating) 
        FROM reviews 
        WHERE facility_id = ? AND is_verified = TRUE
      ),
      total_reviews = (
        SELECT COUNT(*) 
        FROM reviews 
        WHERE facility_id = ? AND is_verified = TRUE
      )
      WHERE id = ?
    `;
    
    await executeQuery(updateRatingQuery, [facilityId, facilityId, facilityId]);

    res.status(201).json({
      success: true,
      message: 'Review added successfully'
    });

  } catch (error) {
    console.error('❌ Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get facility statistics (for admin/analytics)
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const facilityId = req.params.id;
    const userId = req.user.id;

    // Check if user has permission (admin or facility owner)
    // For now, only allow admins
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    // Get facility stats
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM reviews WHERE facility_id = ?) as total_reviews,
        (SELECT COUNT(*) FROM reviews WHERE facility_id = ? AND is_verified = TRUE) as verified_reviews,
        (SELECT AVG(rating) FROM reviews WHERE facility_id = ? AND is_verified = TRUE) as avg_rating,
        (SELECT COUNT(*) FROM pharmacy_medicines WHERE pharmacy_id = ? AND is_available = TRUE) as available_medicines,
        (SELECT COUNT(*) FROM appointments WHERE facility_id = ?) as total_appointments
    `;
    
    const statsResult = await executeQuery(statsQuery, [
      facilityId, facilityId, facilityId, facilityId, facilityId
    ]);

    if (!statsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch facility statistics'
      });
    }

    res.json({
      success: true,
      data: statsResult.data[0]
    });

  } catch (error) {
    console.error('❌ Get facility stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add medicine to pharmacy (facility-admin/pharmacist only)
router.post('/:id/medicines', authenticateToken, requireRole(['facility-admin', 'pharmacist', 'admin']), [
  body('medicine_id').isInt({ min: 1 }).withMessage('Valid medicine ID is required').toInt(),
  body('stock_quantity').isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer').toInt(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number').toFloat(),
  body('discount_price').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Discount price must be a positive number').toFloat(),
  body('expiry_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Expiry date must be a valid date (YYYY-MM-DD)').toDate(),
  body('is_available').optional().isBoolean().withMessage('is_available must be a boolean').toBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const facilityId = parseInt(req.params.id, 10);
    const userId = parseInt(req.user.id, 10);
    const userRole = req.user.user_type;
    const { medicine_id, stock_quantity, price, discount_price, expiry_date, is_available } = req.body;
    
    console.log('🔍 Add medicine request data:', {
      facilityId,
      facilityIdType: typeof facilityId,
      userId,
      userIdType: typeof userId,
      userRole,
      medicine_id,
      medicine_idType: typeof medicine_id,
      stock_quantity,
      stock_quantityType: typeof stock_quantity,
      price,
      priceType: typeof price,
      discount_price,
      discount_priceType: typeof discount_price,
      is_available
    });

    // Validate facilityId
    if (isNaN(facilityId) || facilityId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid facility ID'
      });
    }

    // Check if facility exists
    const facilityQuery = 'SELECT id, facility_type FROM healthcare_facilities WHERE id = ?';
    const facilityResult = await executeQuery(facilityQuery, [facilityId]);

    if (!facilityResult.success || facilityResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    const facility = facilityResult.data[0];

    // Check if user has permission to manage this facility
    // User can manage if:
    // 1. They own the facility (user_id in healthcare_facilities)
    // 2. They are a pharmacist/doctor associated with the facility (facility_id in healthcare_professionals)
    
    console.log('🔍 Checking permissions for user:', {
      userId,
      userRole,
      facilityId
    });
    
    if (userRole === 'facility-admin' || userRole === 'admin') {
      // Facility admins must own the facility
      const ownershipQuery = 'SELECT id FROM healthcare_facilities WHERE id = ? AND user_id = ?';
      const ownershipResult = await executeQuery(ownershipQuery, [facilityId, userId]);
      
      if (!ownershipResult.success || ownershipResult.data.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage this facility'
        });
      }
    } else if (userRole === 'pharmacist' || userRole === 'doctor') {
      // Pharmacists/doctors must be associated with the facility
      console.log('🔍 Checking pharmacist/doctor association:', {
        userId,
        facilityId,
        userRole
      });
      
      // Check both integer and string comparisons to handle type mismatches
      const professionalQuery = `
        SELECT id, facility_id, user_id 
        FROM healthcare_professionals 
        WHERE user_id = ? AND (facility_id = ? OR CAST(facility_id AS CHAR) = ?)
      `;
      const professionalResult = await executeQuery(professionalQuery, [userId, facilityId, facilityId.toString()]);
      
      console.log('🔍 Professional association check result:', {
        success: professionalResult.success,
        found: professionalResult.data?.length || 0,
        data: professionalResult.data,
        queryParams: [userId, facilityId, facilityId.toString()]
      });
      
      if (!professionalResult.success) {
        console.error('❌ Error checking professional association:', professionalResult.error);
        return res.status(500).json({
          success: false,
          message: 'Error checking facility association'
        });
      }
      
      if (professionalResult.data.length === 0) {
        // Also check if they have any professional record at all
        const anyProfessionalQuery = 'SELECT id, facility_id, user_id FROM healthcare_professionals WHERE user_id = ?';
        const anyProfessionalResult = await executeQuery(anyProfessionalQuery, [userId]);
        
        console.log('🔍 Checking if user has any professional record:', {
          found: anyProfessionalResult.data?.length || 0,
          records: anyProfessionalResult.data
        });
        
        const userFacilityId = anyProfessionalResult.data?.[0]?.facility_id;
        return res.status(403).json({
          success: false,
          message: `You are not associated with facility ID ${facilityId}. ${userFacilityId ? `Your current facility_id is ${userFacilityId}.` : 'You do not have a facility assigned.'} Please contact your facility administrator.`
        });
      }
      
      console.log('✅ Pharmacist/doctor is associated with facility:', professionalResult.data[0]);
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage medicines'
      });
    }

    // Only allow adding medicines to pharmacies
    if (facility.facility_type !== 'pharmacy') {
      return res.status(400).json({
        success: false,
        message: 'Medicines can only be added to pharmacies'
      });
    }

    // Check if medicine exists
    const medicineQuery = 'SELECT id FROM medicines WHERE id = ? AND is_active = TRUE';
    const medicineResult = await executeQuery(medicineQuery, [medicine_id]);

    if (!medicineResult.success || medicineResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found'
      });
    }

    // Check if medicine already exists in pharmacy
    const existingQuery = 'SELECT id FROM pharmacy_medicines WHERE pharmacy_id = ? AND medicine_id = ?';
    const existingResult = await executeQuery(existingQuery, [facilityId, medicine_id]);

    if (existingResult.success && existingResult.data.length > 0) {
      // Update existing entry
      const updateQuery = `
        UPDATE pharmacy_medicines 
        SET stock_quantity = ?, price = ?, discount_price = ?, expiry_date = ?, is_available = ?, updated_at = NOW()
        WHERE id = ?
      `;
      const updateResult = await executeQuery(updateQuery, [
        stock_quantity,
        price,
        discount_price || null,
        expiry_date || null,
        is_available !== undefined ? is_available : true,
        existingResult.data[0].id
      ]);

      if (!updateResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update medicine in pharmacy'
        });
      }

      return res.json({
        success: true,
        message: 'Medicine updated in pharmacy successfully',
        data: { id: existingResult.data[0].id }
      });
    }

    // Insert new entry
    // pharmacy_id should be the same as facility_id
    const pharmacyId = facilityId; // facility_id and pharmacy_id are the same
    
    const insertQuery = `
      INSERT INTO pharmacy_medicines (facility_id, pharmacy_id, medicine_id, stock_quantity, price, discount_price, expiry_date, is_available, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    // Prepare values array - pharmacy_id is the first value
    const insertValues = [
      pharmacyId, // pharmacy_id = facility_id (FIRST PARAMETER)
      facilityId, // facility_id (SECOND PARAMETER)
      medicine_id,
      stock_quantity,
      price,
      discount_price || null,
      expiry_date || null,
      is_available !== undefined ? is_available : true
    ];
    
    console.log('🔍 Inserting medicine - SQL Query:', insertQuery);
    console.log('🔍 Inserting medicine - Values array:', insertValues);
    console.log('🔍 Inserting medicine - Detailed values:', {
      'pharmacy_id (position 0)': insertValues[0],
      'facility_id (position 1)': insertValues[1],
      'medicine_id (position 2)': insertValues[2],
      'stock_quantity (position 3)': insertValues[3],
      'price (position 3)': insertValues[3],
      'discount_price (position 5)': insertValues[4],
      'is_available (position 5)': insertValues[5]
    });
    
    const insertResult = await executeQuery(insertQuery, insertValues);
    
    console.log('🔍 Insert result:', {
      success: insertResult.success,
      insertId: insertResult.data?.insertId,
      error: insertResult.error
    });

    if (!insertResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to add medicine to pharmacy'
      });
    }

    const pharmacyMedicineId = insertResult.data.insertId;

    // Check for low stock and expiring medicines and send notifications
    // Get medicine details
    const addedMedicineQuery = `
      SELECT 
        pm.id, pm.stock_quantity, pm.expiry_date, pm.medicine_id,
        m.name, m.generic_name
      FROM pharmacy_medicines pm
      JOIN medicines m ON pm.medicine_id = m.id
      WHERE pm.id = ?
    `;
    const addedMedicineResult = await executeQuery(addedMedicineQuery, [pharmacyMedicineId]);
    
    if (addedMedicineResult.success && addedMedicineResult.data.length > 0) {
      const medicine = addedMedicineResult.data[0];
      const medicineName = medicine.name || medicine.generic_name || 'Medicine';
      
      // Get facility owner and all pharmacists/doctors associated with the facility
      const facilityUsersQuery = `
        SELECT DISTINCT u.id, u.user_type
        FROM users u
        LEFT JOIN healthcare_facilities hf ON hf.user_id = u.id
        LEFT JOIN healthcare_professionals hp ON hp.user_id = u.id
        WHERE (hf.id = ? OR hp.facility_id = ?)
      `;
      const facilityUsersResult = await executeQuery(facilityUsersQuery, [facilityId, facilityId]);
      
      const userIdsToNotify = [];
      const currentUserId = parseInt(req.user.id, 10); // Exclude the user who made the change
      if (facilityUsersResult.success && facilityUsersResult.data) {
        facilityUsersResult.data.forEach(user => {
          if (user.id && !userIdsToNotify.includes(user.id) && user.id !== currentUserId) {
            userIdsToNotify.push(user.id);
          }
        });
      }
      
      console.log('🔔 Notification check - Users to notify (excluding current user):', userIdsToNotify);
      console.log('🔔 Notification check - Current user (excluded):', currentUserId);
      
      // Check for low stock (<= 10)
      if (medicine.stock_quantity !== undefined && medicine.stock_quantity <= 10 && medicine.stock_quantity > 0) {
        const lowStockMessage = `${medicineName} is running low on stock. Current quantity: ${medicine.stock_quantity}`;
        
        // Send notifications to all facility users
        for (const userId of userIdsToNotify) {
          // Create database notification
          await createNotification({
            userId: userId,
            type: 'medicine',
            title: '⚠️ Low Stock Alert',
            message: lowStockMessage,
            data: {
              medicineId: medicine.medicine_id,
              pharmacyMedicineId: medicine.id,
              stockQuantity: medicine.stock_quantity,
              type: 'low_stock',
            },
          }).catch(err => console.error('❌ Error creating low stock notification:', err));
          
          // Send push notification
          const pushNotificationData = {
            title: '⚠️ Low Stock Alert',
            body: lowStockMessage,
            data: {
              type: 'medicine',
              medicineId: medicine.medicine_id,
              pharmacyMedicineId: medicine.id,
              stockQuantity: medicine.stock_quantity,
              alertType: 'low_stock',
            },
            sound: true,
            badge: 1,
            priority: 'high',
          };
          
          pushNotificationService.sendNotificationToUser(userId, pushNotificationData)
            .then(result => {
              if (result.success) {
                console.log(`✅ Low stock push notification sent to user ${userId}`);
              } else {
                console.log(`⚠️ Failed to send low stock push notification to user ${userId}:`, result.message);
              }
            })
            .catch(error => {
              console.error(`❌ Error sending low stock push notification to user ${userId}:`, error);
            });
        }
      }
      
      // Check for out of stock (== 0)
      if (medicine.stock_quantity !== undefined && medicine.stock_quantity === 0) {
        const outOfStockMessage = `${medicineName} is out of stock. Please restock immediately.`;
        
        // Send notifications to all facility users
        for (const userId of userIdsToNotify) {
          // Create database notification
          await createNotification({
            userId: userId,
            type: 'medicine',
            title: '🚨 Out of Stock Alert',
            message: outOfStockMessage,
            data: {
              medicineId: medicine.medicine_id,
              pharmacyMedicineId: medicine.id,
              stockQuantity: 0,
              type: 'out_of_stock',
            },
          }).catch(err => console.error('❌ Error creating out of stock notification:', err));
          
          // Send push notification
          const pushNotificationData = {
            title: '🚨 Out of Stock Alert',
            body: outOfStockMessage,
            data: {
              type: 'medicine',
              medicineId: medicine.medicine_id,
              pharmacyMedicineId: medicine.id,
              stockQuantity: 0,
              alertType: 'out_of_stock',
            },
            sound: true,
            badge: 1,
            priority: 'high',
          };
          
          pushNotificationService.sendNotificationToUser(userId, pushNotificationData)
            .then(result => {
              if (result.success) {
                console.log(`✅ Out of stock push notification sent to user ${userId}`);
              } else {
                console.log(`⚠️ Failed to send out of stock push notification to user ${userId}:`, result.message);
              }
            })
            .catch(error => {
              console.error(`❌ Error sending out of stock push notification to user ${userId}:`, error);
            });
        }
      }
      
      // Check for expiring soon (within 30 days)
      if (medicine.expiry_date) {
        const expiryDate = new Date(medicine.expiry_date);
        const today = new Date();
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        
        // Check if medicine is expiring within 30 days
        if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
          const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
          const expiryMessage = `${medicineName} is expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Expiry date: ${expiryDate.toLocaleDateString()}`;
          
          // Send notifications to all facility users
          for (const userId of userIdsToNotify) {
            // Create database notification
            await createNotification({
              userId: userId,
              type: 'medicine',
              title: '⏰ Medicine Expiring Soon',
              message: expiryMessage,
              data: {
                medicineId: medicine.medicine_id,
                pharmacyMedicineId: medicine.id,
                expiryDate: medicine.expiry_date,
                daysUntilExpiry: daysUntilExpiry,
                type: 'expiring_soon',
              },
            }).catch(err => console.error('❌ Error creating expiry notification:', err));
            
            // Send push notification
            const pushNotificationData = {
              title: '⏰ Medicine Expiring Soon',
              body: expiryMessage,
              data: {
                type: 'medicine',
                medicineId: medicine.medicine_id,
                pharmacyMedicineId: medicine.id,
                expiryDate: medicine.expiry_date,
                daysUntilExpiry: daysUntilExpiry,
                alertType: 'expiring_soon',
              },
              sound: true,
              badge: 1,
              priority: 'high',
            };
            
            pushNotificationService.sendNotificationToUser(userId, pushNotificationData)
              .then(result => {
                if (result.success) {
                  console.log(`✅ Expiry push notification sent to user ${userId}`);
                } else {
                  console.log(`⚠️ Failed to send expiry push notification to user ${userId}:`, result.message);
                }
              })
              .catch(error => {
                console.error(`❌ Error sending expiry push notification to user ${userId}:`, error);
              });
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Medicine added to pharmacy successfully',
      data: { id: pharmacyMedicineId }
    });

  } catch (error) {
    console.error('❌ Add medicine to pharmacy error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update pharmacy medicine (facility-admin/pharmacist only)
router.put('/:id/medicines/:pharmacyMedicineId', authenticateToken, requireRole(['facility-admin', 'pharmacist', 'admin']), [
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer').toInt(),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number').toFloat(),
  body('discount_price').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Discount price must be a positive number').toFloat(),
  body('expiry_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Expiry date must be a valid date (YYYY-MM-DD)').toDate(),
  body('batch_number').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }).trim(),
  body('is_available').optional().isBoolean().withMessage('is_available must be a boolean').toBoolean(),
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

    const facilityId = parseInt(req.params.id, 10);
    const pharmacyMedicineId = parseInt(req.params.pharmacyMedicineId, 10);
    const userId = parseInt(req.user.id, 10);
    const userRole = req.user.user_type;
    const { stock_quantity, price, discount_price, expiry_date, batch_number, is_available } = req.body;

    console.log('🔍 Update pharmacy medicine request:', {
      facilityId,
      pharmacyMedicineId,
      userId,
      userRole,
      updateData: req.body
    });

    // Check if facility exists
    const facilityQuery = 'SELECT id, facility_type FROM healthcare_facilities WHERE id = ?';
    const facilityResult = await executeQuery(facilityQuery, [facilityId]);

    if (!facilityResult.success || facilityResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    const facility = facilityResult.data[0];

    // Check if user has permission to manage this facility
    console.log('🔍 Checking permissions for user:', {
      userId,
      userRole,
      facilityId
    });

    if (userRole === 'facility-admin' || userRole === 'admin') {
      // Facility admins must own the facility
      const ownershipQuery = 'SELECT id FROM healthcare_facilities WHERE id = ? AND user_id = ?';
      const ownershipResult = await executeQuery(ownershipQuery, [facilityId, userId]);
      
      if (!ownershipResult.success || ownershipResult.data.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage this facility'
        });
      }
    } else if (userRole === 'pharmacist' || userRole === 'doctor') {
      // Pharmacists/doctors must be associated with the facility
      console.log('🔍 Checking pharmacist/doctor association:', {
        userId,
        facilityId,
        userRole
      });
      
      const professionalQuery = `
        SELECT id, facility_id, user_id 
        FROM healthcare_professionals 
        WHERE user_id = ? AND (facility_id = ? OR CAST(facility_id AS CHAR) = ?)
      `;
      const professionalResult = await executeQuery(professionalQuery, [userId, facilityId, facilityId.toString()]);
      
      console.log('🔍 Professional association check result:', {
        success: professionalResult.success,
        found: professionalResult.data?.length || 0,
        data: professionalResult.data
      });
      
      if (!professionalResult.success) {
        console.error('❌ Error checking professional association:', professionalResult.error);
        return res.status(500).json({
          success: false,
          message: 'Error checking facility association'
        });
      }
      
      if (professionalResult.data.length === 0) {
        const anyProfessionalQuery = 'SELECT id, facility_id, user_id FROM healthcare_professionals WHERE user_id = ?';
        const anyProfessionalResult = await executeQuery(anyProfessionalQuery, [userId]);
        
        console.log('🔍 Checking if user has any professional record:', {
          found: anyProfessionalResult.data?.length || 0,
          records: anyProfessionalResult.data
        });
        
        const userFacilityId = anyProfessionalResult.data?.[0]?.facility_id;
        return res.status(403).json({
          success: false,
          message: `You are not associated with facility ID ${facilityId}. ${userFacilityId ? `Your current facility_id is ${userFacilityId}.` : 'You do not have a facility assigned.'} Please contact your facility administrator.`
        });
      }
      
      console.log('✅ Pharmacist/doctor is associated with facility:', professionalResult.data[0]);
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to manage medicines'
      });
    }

    // Check if pharmacy medicine exists and belongs to this facility
    const pharmacyMedicineQuery = `
      SELECT id, pharmacy_id, facility_id, medicine_id 
      FROM pharmacy_medicines 
      WHERE id = ? AND (pharmacy_id = ? OR facility_id = ?)
    `;
    const pharmacyMedicineResult = await executeQuery(pharmacyMedicineQuery, [
      pharmacyMedicineId,
      facilityId,
      facilityId
    ]);

    if (!pharmacyMedicineResult.success || pharmacyMedicineResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy medicine not found or does not belong to this facility'
      });
    }

    // Build update query dynamically based on provided fields
    const updateFields = [];
    const updateValues = [];

    if (stock_quantity !== undefined) {
      updateFields.push('stock_quantity = ?');
      updateValues.push(stock_quantity);
    }
    if (price !== undefined) {
      updateFields.push('price = ?');
      updateValues.push(price);
    }
    if (discount_price !== undefined) {
      updateFields.push('discount_price = ?');
      updateValues.push(discount_price);
    }
    if (expiry_date !== undefined) {
      updateFields.push('expiry_date = ?');
      updateValues.push(expiry_date);
    }
    if (batch_number !== undefined) {
      updateFields.push('batch_number = ?');
      updateValues.push(batch_number);
    }
    if (is_available !== undefined) {
      updateFields.push('is_available = ?');
      updateValues.push(is_available);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(pharmacyMedicineId);

    const updateQuery = `
      UPDATE pharmacy_medicines 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    console.log('🔍 Update query:', updateQuery);
    console.log('🔍 Update values:', updateValues);

    const updateResult = await executeQuery(updateQuery, updateValues);

    if (!updateResult.success) {
      console.error('❌ Update failed:', updateResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update pharmacy medicine',
        error: updateResult.error
      });
    }

    console.log('✅ Pharmacy medicine updated successfully');

    // Check for low stock and expiring medicines and send notifications
    try {
      // Get updated medicine details
      const updatedMedicineQuery = `
        SELECT 
          pm.id, pm.stock_quantity, pm.expiry_date, pm.medicine_id,
          m.name, m.generic_name
        FROM pharmacy_medicines pm
        JOIN medicines m ON pm.medicine_id = m.id
        WHERE pm.id = ?
      `;
      const updatedMedicineResult = await executeQuery(updatedMedicineQuery, [pharmacyMedicineId]);
      
      console.log('🔔 Notification check - Medicine query result:', {
        success: updatedMedicineResult.success,
        hasData: updatedMedicineResult.data?.length > 0,
        medicineId: pharmacyMedicineId
      });
      
      if (updatedMedicineResult.success && updatedMedicineResult.data.length > 0) {
        const medicine = updatedMedicineResult.data[0];
        // Ensure stock_quantity is a number
        const stockQuantity = parseInt(medicine.stock_quantity, 10) || 0;
        const medicineName = medicine.name || medicine.generic_name || 'Medicine';
        
        console.log('🔔 Notification check - Medicine details:', {
          name: medicineName,
          stockQuantity: stockQuantity,
          stockQuantityType: typeof stockQuantity,
          expiryDate: medicine.expiry_date
        });
        
        // Get facility owner and all pharmacists/doctors associated with the facility
        const facilityUsersQuery = `
          SELECT DISTINCT u.id, u.user_type
          FROM users u
          LEFT JOIN healthcare_facilities hf ON hf.user_id = u.id
          LEFT JOIN healthcare_professionals hp ON hp.user_id = u.id
          WHERE (hf.id = ? OR hp.facility_id = ?)
        `;
        const facilityUsersResult = await executeQuery(facilityUsersQuery, [facilityId, facilityId]);
        
        console.log('🔔 Notification check - Facility users query result:', {
          success: facilityUsersResult.success,
          userCount: facilityUsersResult.data?.length || 0,
          facilityId: facilityId
        });
        
        const userIdsToNotify = [];
        const currentUserId = parseInt(req.user.id, 10); // Exclude the user who made the change
        if (facilityUsersResult.success && facilityUsersResult.data) {
          facilityUsersResult.data.forEach(user => {
            if (user.id && !userIdsToNotify.includes(user.id) && user.id !== currentUserId) {
              userIdsToNotify.push(user.id);
            }
          });
        }
        
        console.log('🔔 Notification check - Users to notify (excluding current user):', userIdsToNotify);
        console.log('🔔 Notification check - Current user (excluded):', currentUserId);
        
        if (userIdsToNotify.length === 0) {
          console.warn('⚠️ No users found to notify for facility:', facilityId);
        }
        
        // Check for out of stock (== 0) - Check this FIRST before low stock
        if (stockQuantity === 0) {
          console.log('🔔 Out of stock detected! Sending notifications...');
          const outOfStockMessage = `${medicineName} is out of stock. Please restock immediately.`;
          
          // Send notifications to all facility users
          for (const userId of userIdsToNotify) {
            console.log(`🔔 Sending out of stock notification to user ${userId}`);
            
            // Create database notification
            const notificationResult = await createNotification({
              userId: userId,
              type: 'medicine',
              title: '🚨 Out of Stock Alert',
              message: outOfStockMessage,
              data: {
                medicineId: medicine.medicine_id,
                pharmacyMedicineId: medicine.id,
                stockQuantity: 0,
                type: 'out_of_stock',
              },
            });
            
            if (notificationResult.success) {
              console.log(`✅ Out of stock database notification created for user ${userId}`);
            } else {
              console.error(`❌ Failed to create out of stock database notification for user ${userId}:`, notificationResult.message);
            }
            
            // Send push notification
            const pushNotificationData = {
              title: '🚨 Out of Stock Alert',
              body: outOfStockMessage,
              data: {
                type: 'medicine',
                medicineId: medicine.medicine_id,
                pharmacyMedicineId: medicine.id,
                stockQuantity: 0,
                alertType: 'out_of_stock',
              },
              sound: true,
              badge: 1,
              priority: 'high',
            };
            
            pushNotificationService.sendNotificationToUser(userId, pushNotificationData)
              .then(result => {
                if (result.success) {
                  console.log(`✅ Out of stock push notification sent to user ${userId}`);
                } else {
                  console.log(`⚠️ Failed to send out of stock push notification to user ${userId}:`, result.message);
                }
              })
              .catch(error => {
                console.error(`❌ Error sending out of stock push notification to user ${userId}:`, error);
              });
          }
        }
        
        // Check for low stock (<= 10 but > 0)
        if (stockQuantity > 0 && stockQuantity <= 10) {
          console.log('🔔 Low stock detected! Sending notifications...');
          const lowStockMessage = `${medicineName} is running low on stock. Current quantity: ${stockQuantity}`;
          
          // Send notifications to all facility users
          for (const userId of userIdsToNotify) {
            console.log(`🔔 Sending low stock notification to user ${userId}`);
            
            // Create database notification
            const notificationResult = await createNotification({
              userId: userId,
              type: 'medicine',
              title: '⚠️ Low Stock Alert',
              message: lowStockMessage,
              data: {
                medicineId: medicine.medicine_id,
                pharmacyMedicineId: medicine.id,
                stockQuantity: stockQuantity,
                type: 'low_stock',
              },
            });
            
            if (notificationResult.success) {
              console.log(`✅ Low stock database notification created for user ${userId}`);
            } else {
              console.error(`❌ Failed to create low stock database notification for user ${userId}:`, notificationResult.message);
            }
            
            // Send push notification
            const pushNotificationData = {
              title: '⚠️ Low Stock Alert',
              body: lowStockMessage,
              data: {
                type: 'medicine',
                medicineId: medicine.medicine_id,
                pharmacyMedicineId: medicine.id,
                stockQuantity: stockQuantity,
                alertType: 'low_stock',
              },
              sound: true,
              badge: 1,
              priority: 'high',
            };
            
            pushNotificationService.sendNotificationToUser(userId, pushNotificationData)
              .then(result => {
                if (result.success) {
                  console.log(`✅ Low stock push notification sent to user ${userId}`);
                } else {
                  console.log(`⚠️ Failed to send low stock push notification to user ${userId}:`, result.message);
                }
              })
              .catch(error => {
                console.error(`❌ Error sending low stock push notification to user ${userId}:`, error);
              });
          }
        }
        
        // Check for expiring soon (within 30 days)
        if (medicine.expiry_date) {
          const expiryDate = new Date(medicine.expiry_date);
          const today = new Date();
          const thirtyDaysFromNow = new Date(today);
          thirtyDaysFromNow.setDate(today.getDate() + 30);
          
          // Check if medicine is expiring within 30 days
          if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
            console.log('🔔 Expiring soon detected! Sending notifications...');
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            const expiryMessage = `${medicineName} is expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Expiry date: ${expiryDate.toLocaleDateString()}`;
            
            // Send notifications to all facility users
            for (const userId of userIdsToNotify) {
              console.log(`🔔 Sending expiry notification to user ${userId}`);
              
              // Create database notification
              const notificationResult = await createNotification({
                userId: userId,
                type: 'medicine',
                title: '⏰ Medicine Expiring Soon',
                message: expiryMessage,
                data: {
                  medicineId: medicine.medicine_id,
                  pharmacyMedicineId: medicine.id,
                  expiryDate: medicine.expiry_date,
                  daysUntilExpiry: daysUntilExpiry,
                  type: 'expiring_soon',
                },
              });
              
              if (notificationResult.success) {
                console.log(`✅ Expiry database notification created for user ${userId}`);
              } else {
                console.error(`❌ Failed to create expiry database notification for user ${userId}:`, notificationResult.message);
              }
              
              // Send push notification
              const pushNotificationData = {
                title: '⏰ Medicine Expiring Soon',
                body: expiryMessage,
                data: {
                  type: 'medicine',
                  medicineId: medicine.medicine_id,
                  pharmacyMedicineId: medicine.id,
                  expiryDate: medicine.expiry_date,
                  daysUntilExpiry: daysUntilExpiry,
                  alertType: 'expiring_soon',
                },
                sound: true,
                badge: 1,
                priority: 'high',
              };
              
              pushNotificationService.sendNotificationToUser(userId, pushNotificationData)
                .then(result => {
                  if (result.success) {
                    console.log(`✅ Expiry push notification sent to user ${userId}`);
                  } else {
                    console.log(`⚠️ Failed to send expiry push notification to user ${userId}:`, result.message);
                  }
                })
                .catch(error => {
                  console.error(`❌ Error sending expiry push notification to user ${userId}:`, error);
                });
            }
          }
        }
      } else {
        console.warn('⚠️ Could not fetch medicine details for notification check');
      }
    } catch (notificationError) {
      console.error('❌ Error checking for notifications:', notificationError);
      // Don't fail the request if notification check fails
    }

    res.json({
      success: true,
      message: 'Pharmacy medicine updated successfully',
      data: { id: pharmacyMedicineId }
    });

  } catch (error) {
    console.error('❌ Update pharmacy medicine error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update facility (facility-admin only)
router.put('/:id', authenticateToken, requireRole(['facility-admin', 'admin']), upload.array('images', 5), [
  body('name').optional().trim().isLength({ min: 2, max: 200 }),
  body('address').optional().trim().isLength({ min: 5, max: 500 }),
  body('city').optional().trim().isLength({ min: 2, max: 100 }),
  body('state').optional().trim().isLength({ max: 100 }),
  body('postal_code').optional().trim().isLength({ max: 20 }),
  body('phone').optional().trim().isLength({ min: 10, max: 20 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('website').optional().isURL().optional({ nullable: true, checkFalsy: true }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('emergency_contact').optional().trim().isLength({ max: 100 }),
  body('operating_hours').optional().custom((value) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed !== null;
      } catch {
        return false;
      }
    }
    return typeof value === 'object' && value !== null;
  }),
  body('services').optional().custom((value) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed);
      } catch {
        return false;
      }
    }
    return Array.isArray(value);
  }),
  body('accepts_insurance').optional().isBoolean(),
  body('has_delivery').optional().isBoolean(),
  body('has_consultation').optional().isBoolean(),
  body('is_active').optional().isBoolean(),
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

    const facilityId = parseInt(req.params.id, 10);
    const userId = parseInt(req.user.id, 10);

    // Check if facility exists and user owns it
    const facilityQuery = `
      SELECT id, user_id, facility_type, images 
      FROM healthcare_facilities 
      WHERE id = ? AND user_id = ?
    `;
    const facilityResult = await executeQuery(facilityQuery, [facilityId, userId]);

    if (!facilityResult.success || facilityResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found or you do not have permission to update it'
      });
    }

    const existingFacility = facilityResult.data[0];

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (req.body.name) {
      updateFields.push('name = ?');
      updateValues.push(req.body.name.trim());
    }
    if (req.body.address) {
      updateFields.push('address = ?');
      updateValues.push(req.body.address.trim());
    }
    if (req.body.city) {
      updateFields.push('city = ?');
      updateValues.push(req.body.city.trim());
    }
    if (req.body.state !== undefined) {
      updateFields.push('state = ?');
      updateValues.push(req.body.state ? req.body.state.trim() : null);
    }
    if (req.body.postal_code !== undefined) {
      updateFields.push('postal_code = ?');
      updateValues.push(req.body.postal_code ? req.body.postal_code.trim() : null);
    }
    if (req.body.phone) {
      updateFields.push('phone = ?');
      updateValues.push(req.body.phone.trim());
    }
    if (req.body.email) {
      // Check if email is already taken by another facility
      const emailCheckQuery = 'SELECT id FROM healthcare_facilities WHERE email = ? AND id != ?';
      const emailCheckResult = await executeQuery(emailCheckQuery, [req.body.email, facilityId]);
      
      if (emailCheckResult.success && emailCheckResult.data.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'A facility with this email address already exists'
        });
      }
      
      updateFields.push('email = ?');
      updateValues.push(req.body.email);
    }
    if (req.body.website !== undefined) {
      updateFields.push('website = ?');
      updateValues.push(req.body.website ? req.body.website.trim() : null);
    }
    if (req.body.description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(req.body.description ? req.body.description.trim() : null);
    }
    if (req.body.emergency_contact !== undefined) {
      updateFields.push('emergency_contact = ?');
      updateValues.push(req.body.emergency_contact ? req.body.emergency_contact.trim() : null);
    }
    if (req.body.operating_hours) {
      const operatingHours = typeof req.body.operating_hours === 'string' 
        ? JSON.parse(req.body.operating_hours) 
        : req.body.operating_hours;
      updateFields.push('operating_hours = ?');
      updateValues.push(JSON.stringify(operatingHours));
    }
    if (req.body.services) {
      const services = typeof req.body.services === 'string' 
        ? JSON.parse(req.body.services) 
        : req.body.services;
      updateFields.push('services = ?');
      updateValues.push(JSON.stringify(services));
    }
    if (req.body.accepts_insurance !== undefined) {
      updateFields.push('accepts_insurance = ?');
      updateValues.push(req.body.accepts_insurance === true || req.body.accepts_insurance === 'true');
    }
    if (req.body.has_delivery !== undefined) {
      updateFields.push('has_delivery = ?');
      updateValues.push(req.body.has_delivery === true || req.body.has_delivery === 'true');
    }
    if (req.body.has_consultation !== undefined) {
      updateFields.push('has_consultation = ?');
      updateValues.push(req.body.has_consultation === true || req.body.has_consultation === 'true');
    }
    if (req.body.is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(req.body.is_active === true || req.body.is_active === 'true');
    }

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      let existingImages = [];
      if (existingFacility.images) {
        try {
          existingImages = typeof existingFacility.images === 'string' 
            ? JSON.parse(existingFacility.images) 
            : existingFacility.images;
        } catch (e) {
          existingImages = [];
        }
      }

      const newImageUrls = req.files.map(file => {
        const prefix = existingFacility.facility_type === 'hospital' ? 'hospital' : 'pharmacy';
        return `/uploads/${prefix}-images/${file.filename}`;
      });

      const allImages = [...existingImages, ...newImageUrls];
      updateFields.push('images = ?');
      updateValues.push(JSON.stringify(allImages));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    // Add updated_at
    updateFields.push('updated_at = NOW()');
    updateValues.push(facilityId);

    const updateQuery = `
      UPDATE healthcare_facilities 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    const updateResult = await executeQuery(updateQuery, updateValues);

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update facility'
      });
    }

    // Get updated facility
    const getUpdatedQuery = `
      SELECT 
        id, name, facility_type, address, city, state, postal_code,
        phone, email, website, operating_hours, emergency_contact,
        services, description, accepts_insurance, has_delivery,
        has_consultation, images, is_active, is_verified, created_at, updated_at
      FROM healthcare_facilities 
      WHERE id = ?
    `;
    const updatedResult = await executeQuery(getUpdatedQuery, [facilityId]);

    if (!updatedResult.success || updatedResult.data.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve updated facility'
      });
    }

    let updatedFacility = updatedResult.data[0];

    // Parse JSON fields
    if (updatedFacility.operating_hours) {
      try {
        updatedFacility.operating_hours = typeof updatedFacility.operating_hours === 'string'
          ? JSON.parse(updatedFacility.operating_hours)
          : updatedFacility.operating_hours;
      } catch (e) {
        updatedFacility.operating_hours = null;
      }
    }
    if (updatedFacility.services) {
      try {
        updatedFacility.services = typeof updatedFacility.services === 'string'
          ? JSON.parse(updatedFacility.services)
          : updatedFacility.services;
      } catch (e) {
        updatedFacility.services = [];
      }
    }
    if (updatedFacility.images) {
      try {
        updatedFacility.images = typeof updatedFacility.images === 'string'
          ? JSON.parse(updatedFacility.images)
          : updatedFacility.images;
      } catch (e) {
        updatedFacility.images = [];
      }
    }

    res.json({
      success: true,
      message: 'Facility updated successfully',
      data: updatedFacility
    });

  } catch (error) {
    console.error('❌ Update facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 