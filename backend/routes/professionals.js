const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { executeQuery } = require('../config/database');

const router = express.Router();

// Get all healthcare professionals
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      specialty, 
      is_available,
      sort_by = 'rating',
      sort_order = 'DESC'
    } = req.query;
    
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
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM healthcare_professionals 
      ${whereClause}
    `;
    
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
    
    const [countResult] = await executeQuery(countQuery, params);
    const professionals = await executeQuery(professionalsQuery, [...params, parseInt(limit), offset]);
    
    res.json({
      success: true,
      data: {
        professionals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching professionals:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get healthcare professionals for home page
router.get('/home/available', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const query = `
      SELECT 
        id, first_name, last_name, specialty, qualification,
        experience_years, rating, total_reviews, is_available,
        profile_image, bio
      FROM healthcare_professionals 
      WHERE is_verified = true 
      AND is_available = true
      ORDER BY rating DESC, experience_years DESC
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
    
    const [professional] = await executeQuery(query, [id]);
    
    if (!professional) {
      return res.status(404).json({ success: false, message: 'Professional not found' });
    }
    
    res.json({ success: true, data: professional });
  } catch (error) {
    console.error('Error fetching professional:', error);
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

module.exports = router; 