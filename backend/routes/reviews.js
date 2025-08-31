const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Create a new review
router.post('/', [
  authenticateToken,
  body('facilityId').notEmpty().withMessage('Facility ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').isString().trim().isLength({ min: 10, max: 500 }).withMessage('Comment must be between 10 and 500 characters'),
  body('userId').notEmpty().withMessage('User ID is required'),
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

    const { facilityId, rating, comment, userId } = req.body;

    // Check if facility exists
    const facilityCheck = await executeQuery(
      'SELECT id FROM healthcare_facilities WHERE id = ? AND is_active = TRUE',
      [facilityId]
    );

    if (!facilityCheck.success || facilityCheck.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Check if user has already reviewed this facility
    const existingReview = await executeQuery(
      'SELECT id FROM facility_reviews WHERE facility_id = ? AND user_id = ?',
      [facilityId, userId]
    );

    if (existingReview.success && existingReview.data.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this facility'
      });
    }

    // Create the review
    const createReview = await executeQuery(
      'INSERT INTO facility_reviews (facility_id, user_id, rating, comment, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [facilityId, userId, rating, comment]
    );

    if (!createReview.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create review'
      });
    }

    // Get the created review with user information
    const reviewId = createReview.data.insertId;
    const getReview = await executeQuery(
      `SELECT 
        fr.id,
        fr.facility_id,
        fr.user_id,
        fr.rating,
        fr.comment,
        fr.created_at,
        fr.updated_at,
        u.first_name,
        u.last_name,
        u.profile_image
      FROM facility_reviews fr
      LEFT JOIN users u ON fr.user_id = u.id
      WHERE fr.id = ?`,
      [reviewId]
    );

    if (!getReview.success || getReview.data.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve created review'
      });
    }

    const review = getReview.data[0];

    console.log(`🎉 Review created successfully! ID: ${review.id}`);
    console.log(`📝 Review details: Rating ${review.rating}/5, Comment: "${review.comment.substring(0, 50)}..."`);
    
    // Update facility average rating
    console.log(`🔄 Triggering facility rating update for facility ${facilityId}...`);
    await updateFacilityRating(facilityId);

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: {
        id: review.id,
        facilityId: review.facility_id,
        userId: review.user_id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        updatedAt: review.updated_at,
        user: {
          firstName: review.first_name,
          lastName: review.last_name,
          profileImage: review.profile_image
        }
      }
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get reviews for a specific facility
router.get('/facility/:facilityId', [
  optionalAuth,
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
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

    const { facilityId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Check if facility exists
    const facilityCheck = await executeQuery(
      'SELECT id FROM healthcare_facilities WHERE id = ? AND is_active = TRUE',
      [facilityId]
    );

    if (!facilityCheck.success || facilityCheck.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Get reviews with user information
    const getReviews = await executeQuery(
      `SELECT 
        fr.id,
        fr.facility_id,
        fr.user_id,
        fr.rating,
        fr.comment,
        fr.created_at,
        fr.updated_at,
        u.first_name,
        u.last_name,
        u.profile_image
      FROM facility_reviews fr
      LEFT JOIN users u ON fr.user_id = u.id
      WHERE fr.facility_id = ?
      ORDER BY fr.created_at DESC
      LIMIT ? OFFSET ?`,
      [facilityId, limit, offset]
    );

    if (!getReviews.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch reviews'
      });
    }

    const reviews = getReviews.data.map(review => ({
      id: review.id,
      facilityId: review.facility_id,
      userId: review.user_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      user: {
        firstName: review.first_name,
        lastName: review.last_name,
        profileImage: review.profile_image
      }
    }));

    res.json({
      success: true,
      message: 'Reviews fetched successfully',
      data: reviews
    });

  } catch (error) {
    console.error('Get facility reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's reviews
router.get('/user/:userId', [
  authenticateToken,
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
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

    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Get user's reviews with facility information
    const getUserReviews = await executeQuery(
      `SELECT 
        fr.id,
        fr.facility_id,
        fr.user_id,
        fr.rating,
        fr.comment,
        fr.created_at,
        fr.updated_at,
        hf.name as facility_name,
        hf.facility_type
      FROM facility_reviews fr
      LEFT JOIN healthcare_facilities hf ON fr.facility_id = hf.id
      WHERE fr.user_id = ?
      ORDER BY fr.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    if (!getUserReviews.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user reviews'
      });
    }

    const reviews = getUserReviews.data.map(review => ({
      id: review.id,
      facilityId: review.facility_id,
      userId: review.user_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      facility: {
        name: review.facility_name,
        type: review.facility_type
      }
    }));

    res.json({
      success: true,
      message: 'User reviews fetched successfully',
      data: reviews
    });

  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get average rating for a facility
router.get('/facility/:facilityId/average', async (req, res) => {
  try {
    const { facilityId } = req.params;

    // Check if facility exists
    const facilityCheck = await executeQuery(
      'SELECT id FROM healthcare_facilities WHERE id = ? AND is_active = TRUE',
      [facilityId]
    );

    if (!facilityCheck.success || facilityCheck.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Get average rating and total reviews
    const getAverageRating = await executeQuery(
      `SELECT 
        AVG(rating) as averageRating,
        COUNT(*) as totalReviews
      FROM facility_reviews 
      WHERE facility_id = ?`,
      [facilityId]
    );

    if (!getAverageRating.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch facility rating'
      });
    }

    const result = getAverageRating.data[0];
    const averageRating = result.averageRating ? parseFloat(result.averageRating.toFixed(1)) : 0;
    const totalReviews = result.totalReviews || 0;

    res.json({
      success: true,
      message: 'Facility rating fetched successfully',
      data: {
        averageRating,
        totalReviews
      }
    });

  } catch (error) {
    console.error('Get facility average rating error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Check if user has already reviewed a facility
router.get('/check/:facilityId/:userId', [
  authenticateToken
], async (req, res) => {
  try {
    const { facilityId, userId } = req.params;

    // Check if user has reviewed this facility
    const checkReview = await executeQuery(
      `SELECT 
        fr.id,
        fr.facility_id,
        fr.user_id,
        fr.rating,
        fr.comment,
        fr.created_at,
        fr.updated_at
      FROM facility_reviews fr
      WHERE fr.facility_id = ? AND fr.user_id = ?`,
      [facilityId, userId]
    );

    if (!checkReview.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check review status'
      });
    }

    const hasReviewed = checkReview.data.length > 0;
    const review = hasReviewed ? checkReview.data[0] : null;

    res.json({
      success: true,
      message: 'Review status checked successfully',
      data: {
        hasReviewed,
        review: hasReviewed ? {
          id: review.id,
          facilityId: review.facility_id,
          userId: review.user_id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.created_at,
          updatedAt: review.updated_at
        } : null
      }
    });

  } catch (error) {
    console.error('Check user review error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update a review
router.put('/:reviewId', [
  authenticateToken,
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isString().trim().isLength({ min: 10, max: 500 }).withMessage('Comment must be between 10 and 500 characters'),
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

    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Check if review exists and belongs to user
    const reviewCheck = await executeQuery(
      'SELECT facility_id FROM facility_reviews WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    );

    if (!reviewCheck.success || reviewCheck.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you are not authorized to update it'
      });
    }

    const facilityId = reviewCheck.data[0].facility_id;

    // Update the review
    const updateFields = [];
    const updateValues = [];

    if (rating !== undefined) {
      updateFields.push('rating = ?');
      updateValues.push(rating);
    }

    if (comment !== undefined) {
      updateFields.push('comment = ?');
      updateValues.push(comment);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(reviewId);

    const updateReview = await executeQuery(
      `UPDATE facility_reviews SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    if (!updateReview.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update review'
      });
    }

    // Update facility average rating
    await updateFacilityRating(facilityId);

    res.json({
      success: true,
      message: 'Review updated successfully'
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete a review
router.delete('/:reviewId', [
  authenticateToken
], async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    // Check if review exists and belongs to user
    const reviewCheck = await executeQuery(
      'SELECT facility_id FROM facility_reviews WHERE id = ? AND user_id = ?',
      [reviewId, userId]
    );

    if (!reviewCheck.success || reviewCheck.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Review not found or you are not authorized to delete it'
      });
    }

    const facilityId = reviewCheck.data[0].facility_id;

    // Delete the review
    const deleteReview = await executeQuery(
      'DELETE FROM facility_reviews WHERE id = ?',
      [reviewId]
    );

    if (!deleteReview.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete review'
      });
    }

    // Update facility average rating
    await updateFacilityRating(facilityId);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Helper function to update facility average rating
async function updateFacilityRating(facilityId) {
  try {
    console.log(`🔍 Updating facility rating for facility ID: ${facilityId}`);
    
    // Get all reviews for this facility
    const getAverageRating = await executeQuery(
      `SELECT 
        AVG(rating) as averageRating,
        COUNT(*) as totalReviews,
        MIN(rating) as minRating,
        MAX(rating) as maxRating
      FROM facility_reviews 
      WHERE facility_id = ?`,
      [facilityId]
    );

    if (getAverageRating.success) {
      const result = getAverageRating.data[0];
      const averageRating = result.averageRating ? parseFloat(result.averageRating.toFixed(1)) : 0;
      const totalReviews = result.totalReviews || 0;
      const minRating = result.minRating || 0;
      const maxRating = result.maxRating || 0;

      console.log(`📊 Facility ${facilityId} rating stats:`, {
        averageRating,
        totalReviews,
        minRating,
        maxRating
      });

      // Update the facility table with new rating and review count
      const updateResult = await executeQuery(
        'UPDATE healthcare_facilities SET rating = ?, review_count = ? WHERE id = ?',
        [averageRating, totalReviews, facilityId]
      );

      if (updateResult.success) {
        console.log(`✅ Successfully updated facility ${facilityId} rating to ${averageRating} (${totalReviews} reviews)`);
      } else {
        console.error(`❌ Failed to update facility ${facilityId} rating:`, updateResult.error);
      }
    } else {
      console.error(`❌ Failed to get average rating for facility ${facilityId}:`, getAverageRating.error);
    }
  } catch (error) {
    console.error(`❌ Update facility rating error for facility ${facilityId}:`, error);
  }
}

module.exports = router; 