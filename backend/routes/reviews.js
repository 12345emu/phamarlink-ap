const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Get all reviews with filters
router.get('/', [
  query('facilityId').optional().isInt().withMessage('Facility ID must be an integer'),
  query('medicineId').optional().isInt().withMessage('Medicine ID must be an integer'),
  query('userId').optional().isInt().withMessage('User ID must be an integer'),
  query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { facilityId, medicineId, userId, rating, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE r.deleted_at IS NULL';
    const params = [];

    if (facilityId) {
      whereClause += ' AND r.facility_id = ?';
      params.push(facilityId);
    }

    if (medicineId) {
      whereClause += ' AND r.medicine_id = ?';
      params.push(medicineId);
    }

    if (userId) {
      whereClause += ' AND r.user_id = ?';
      params.push(userId);
    }

    if (rating) {
      whereClause += ' AND r.rating = ?';
      params.push(rating);
    }

    const query = `
      SELECT 
        r.id, r.rating, r.comment, r.created_at, r.updated_at,
        u.id as user_id, u.first_name, u.last_name, u.email,
        u.profile_picture,
        f.id as facility_id, f.name as facility_name, f.type as facility_type,
        m.id as medicine_id, m.name as medicine_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN healthcare_facilities f ON r.facility_id = f.id
      LEFT JOIN medicines m ON r.medicine_id = m.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);

    const reviews = await db.executeQuery(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM reviews r
      ${whereClause}
    `;
    const countResult = await db.executeQuery(countQuery, params.slice(0, -2));
    const total = countResult[0].total;

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get review by ID
router.get('/:id', [
  param('id').isInt().withMessage('Review ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const query = `
      SELECT 
        r.id, r.rating, r.comment, r.created_at, r.updated_at,
        u.id as user_id, u.first_name, u.last_name, u.email,
        u.profile_picture,
        f.id as facility_id, f.name as facility_name, f.type as facility_type,
        m.id as medicine_id, m.name as medicine_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN healthcare_facilities f ON r.facility_id = f.id
      LEFT JOIN medicines m ON r.medicine_id = m.id
      WHERE r.id = ? AND r.deleted_at IS NULL
    `;

    const reviews = await db.executeQuery(query, [id]);

    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ review: reviews[0] });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new review
router.post('/', [
  authenticateToken,
  body('facilityId').optional().isInt().withMessage('Facility ID must be an integer'),
  body('medicineId').optional().isInt().withMessage('Medicine ID must be an integer'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ max: 1000 }).withMessage('Comment must be less than 1000 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { facilityId, medicineId, rating, comment } = req.body;
    const userId = req.user.id;

    // Validate that either facilityId or medicineId is provided, but not both
    if (!facilityId && !medicineId) {
      return res.status(400).json({ error: 'Either facilityId or medicineId must be provided' });
    }

    if (facilityId && medicineId) {
      return res.status(400).json({ error: 'Cannot review both facility and medicine at the same time' });
    }

    // Check if user has already reviewed this facility/medicine
    const existingReviewQuery = `
      SELECT id FROM reviews 
      WHERE user_id = ? AND deleted_at IS NULL
      ${facilityId ? 'AND facility_id = ?' : 'AND medicine_id = ?'}
    `;
    const existingReview = await db.executeQuery(
      existingReviewQuery, 
      [userId, facilityId || medicineId]
    );

    if (existingReview.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this item' });
    }

    // Verify facility/medicine exists
    if (facilityId) {
      const facility = await db.executeQuery(
        'SELECT id FROM healthcare_facilities WHERE id = ? AND deleted_at IS NULL',
        [facilityId]
      );
      if (facility.length === 0) {
        return res.status(404).json({ error: 'Facility not found' });
      }
    }

    if (medicineId) {
      const medicine = await db.executeQuery(
        'SELECT id FROM medicines WHERE id = ? AND deleted_at IS NULL',
        [medicineId]
      );
      if (medicine.length === 0) {
        return res.status(404).json({ error: 'Medicine not found' });
      }
    }

    const insertQuery = `
      INSERT INTO reviews (user_id, facility_id, medicine_id, rating, comment, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const result = await db.executeQuery(insertQuery, [
      userId, 
      facilityId || null, 
      medicineId || null, 
      rating, 
      comment || null
    ]);

    // Get the created review
    const newReview = await db.executeQuery(
      'SELECT * FROM reviews WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ 
      message: 'Review created successfully',
      review: newReview[0]
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update review
router.put('/:id', [
  authenticateToken,
  param('id').isInt().withMessage('Review ID must be an integer'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ max: 1000 }).withMessage('Comment must be less than 1000 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Check if review exists and belongs to user
    const existingReview = await db.executeQuery(
      'SELECT * FROM reviews WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );

    if (existingReview.length === 0) {
      return res.status(404).json({ error: 'Review not found or access denied' });
    }

    // Update review
    const updateQuery = `
      UPDATE reviews 
      SET rating = ?, comment = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await db.executeQuery(updateQuery, [
      rating !== undefined ? rating : existingReview[0].rating,
      comment !== undefined ? comment : existingReview[0].comment,
      id
    ]);

    // Get updated review
    const updatedReview = await db.executeQuery(
      'SELECT * FROM reviews WHERE id = ?',
      [id]
    );

    res.json({ 
      message: 'Review updated successfully',
      review: updatedReview[0]
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete review (soft delete)
router.delete('/:id', [
  authenticateToken,
  param('id').isInt().withMessage('Review ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Check if review exists and belongs to user
    const existingReview = await db.executeQuery(
      'SELECT * FROM reviews WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );

    if (existingReview.length === 0) {
      return res.status(404).json({ error: 'Review not found or access denied' });
    }

    // Soft delete
    await db.executeQuery(
      'UPDATE reviews SET deleted_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get review statistics
router.get('/stats/summary', [
  query('facilityId').optional().isInt().withMessage('Facility ID must be an integer'),
  query('medicineId').optional().isInt().withMessage('Medicine ID must be an integer'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { facilityId, medicineId } = req.query;

    let whereClause = 'WHERE r.deleted_at IS NULL';
    const params = [];

    if (facilityId) {
      whereClause += ' AND r.facility_id = ?';
      params.push(facilityId);
    }

    if (medicineId) {
      whereClause += ' AND r.medicine_id = ?';
      params.push(medicineId);
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM reviews r
      ${whereClause}
    `;

    const stats = await db.executeQuery(statsQuery, params);

    if (stats.length === 0) {
      return res.json({
        total_reviews: 0,
        average_rating: 0,
        rating_distribution: {
          five_star: 0,
          four_star: 0,
          three_star: 0,
          two_star: 0,
          one_star: 0
        }
      });
    }

    const result = stats[0];
    const ratingDistribution = {
      five_star: result.five_star || 0,
      four_star: result.four_star || 0,
      three_star: result.three_star || 0,
      two_star: result.two_star || 0,
      one_star: result.one_star || 0
    };

    res.json({
      total_reviews: result.total_reviews || 0,
      average_rating: parseFloat(result.average_rating || 0).toFixed(1),
      rating_distribution: ratingDistribution
    });
  } catch (error) {
    console.error('Error fetching review statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 