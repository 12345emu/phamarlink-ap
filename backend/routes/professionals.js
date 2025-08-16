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