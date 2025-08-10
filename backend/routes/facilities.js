const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

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
        created_at
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
    let queryParams = [parseFloat(latitude), parseFloat(longitude), parseFloat(latitude), parseFloat(radius)];

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
        latitude, longitude, phone, rating, total_reviews,
        (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
         cos(radians(longitude) - radians(?)) + 
         sin(radians(?)) * sin(radians(latitude)))) AS distance_km
      FROM healthcare_facilities 
      WHERE ${whereClause}
      HAVING distance_km <= ?
      ORDER BY distance_km ASC
      LIMIT ?
    `;

    queryParams.push(parseInt(limit));
    
    const nearbyResult = await executeQuery(nearbyQuery, queryParams);

    if (!nearbyResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch nearby facilities'
      });
    }

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
        created_at
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

    // If it's a pharmacy, get available medicines
    if (facility.facility_type === 'pharmacy') {
      const medicinesQuery = `
        SELECT 
          m.id, m.name, m.generic_name, m.brand_name, m.description,
          m.category, m.prescription_required, m.dosage_form, m.strength,
          pm.stock_quantity, pm.price, pm.discount_price, pm.is_available
        FROM pharmacy_medicines pm
        JOIN medicines m ON pm.medicine_id = m.id
        WHERE pm.pharmacy_id = ? AND pm.is_available = TRUE AND m.is_active = TRUE
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

module.exports = router; 