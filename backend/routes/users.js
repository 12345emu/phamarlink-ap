const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const { executeQuery, executeTransaction } = require('../config/database');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (role) {
      whereClause += ' AND u.user_type = ?';
      params.push(role);
    }
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users u 
      ${whereClause}
    `;
    
    const usersQuery = `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.user_type, 
        u.phone, u.date_of_birth, u.gender, u.created_at,
        pp.blood_type, pp.allergies, pp.emergency_contact
      FROM users u
      LEFT JOIN patient_profiles pp ON u.id = pp.user_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [countResult] = await executeQuery(countQuery, params);
    const users = await executeQuery(usersQuery, [...params, parseInt(limit), offset]);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Users can only view their own profile, admins can view any profile
    if (req.user.user_type !== 'admin' && userId !== parseInt(id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    const userQuery = `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.user_type, 
        u.phone, u.date_of_birth, u.gender, u.created_at, u.updated_at,
        pp.blood_type, pp.allergies, pp.emergency_contact, pp.medical_history
      FROM users u
      LEFT JOIN patient_profiles pp ON u.id = pp.user_id
      WHERE u.id = ?
    `;
    
    const [user] = await executeQuery(userQuery, [id]);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update user profile
router.put('/:id', authenticateToken, requireOwnership('users'), [
  body('first_name').optional().isLength({ min: 2, max: 50 }).trim(),
  body('last_name').optional().isLength({ min: 2, max: 50 }).trim(),
  body('phone').optional().isMobilePhone(),
  body('date_of_birth').optional().isISO8601(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('blood_type').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  body('allergies').optional().isArray(),
  body('emergency_contact').optional().isObject(),
  body('medical_history').optional().isString()
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
    
    const { id } = req.params;
    const updateData = req.body;
    
    await executeTransaction(async (connection) => {
      // Update users table
      const userFields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'gender'];
      const userUpdates = userFields.filter(field => updateData[field] !== undefined);
      
      if (userUpdates.length > 0) {
        const userQuery = `
          UPDATE users 
          SET ${userUpdates.map(field => `${field} = ?`).join(', ')}, updated_at = NOW()
          WHERE id = ?
        `;
        const userValues = userUpdates.map(field => updateData[field]);
        await connection.execute(userQuery, [...userValues, id]);
      }
      
      // Update or insert patient profile
      const profileFields = ['blood_type', 'allergies', 'emergency_contact', 'medical_history'];
      const profileUpdates = profileFields.filter(field => updateData[field] !== undefined);
      
      if (profileUpdates.length > 0) {
        const profileExistsQuery = 'SELECT id FROM patient_profiles WHERE user_id = ?';
        const [existingProfile] = await connection.execute(profileExistsQuery, [id]);
        
        if (existingProfile.length > 0) {
          // Update existing profile
          const profileQuery = `
            UPDATE patient_profiles 
            SET ${profileUpdates.map(field => `${field} = ?`).join(', ')}
            WHERE user_id = ?
          `;
          const profileValues = profileUpdates.map(field => updateData[field]);
          await connection.execute(profileQuery, [...profileValues, id]);
        } else {
          // Insert new profile
          const profileQuery = `
            INSERT INTO patient_profiles (user_id, ${profileUpdates.join(', ')})
            VALUES (?, ${profileUpdates.map(() => '?').join(', ')})
          `;
          const profileValues = [id, ...profileUpdates.map(field => updateData[field])];
          await connection.execute(profileQuery, profileValues);
        }
      }
    });
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const [user] = await executeQuery('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Soft delete - mark as inactive instead of hard delete
    await executeQuery('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get user statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Users can only view their own stats, admins can view any
    if (req.user.user_type !== 'admin' && userId !== parseInt(id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM appointments WHERE user_id = ?) as total_appointments,
        (SELECT COUNT(*) FROM orders WHERE user_id = ?) as total_orders,
        (SELECT COUNT(*) FROM reviews WHERE user_id = ?) as total_reviews,
        (SELECT COUNT(*) FROM chat_conversations WHERE user_id = ?) as total_conversations
    `;
    
    const [stats] = await executeQuery(statsQuery, [id, id, id, id]);
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Search users by location (for healthcare providers)
router.get('/search/nearby', authenticateToken, requireRole(['pharmacist', 'doctor', 'admin']), async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, user_type } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required' 
      });
    }
    
    let whereClause = 'WHERE u.is_active = true';
    let params = [parseFloat(latitude), parseFloat(longitude), parseFloat(radius)];
    
    if (user_type) {
      whereClause += ' AND u.user_type = ?';
      params.push(user_type);
    }
    
    const query = `
      SELECT 
        u.id, u.first_name, u.last_name, u.user_type, u.phone,
        u.latitude, u.longitude,
        (
          6371 * acos(
            cos(radians(?)) * cos(radians(u.latitude)) * 
            cos(radians(u.longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(u.latitude))
          )
        ) AS distance
      FROM users u
      ${whereClause}
      HAVING distance <= ?
      ORDER BY distance
      LIMIT 50
    `;
    
    const users = await executeQuery(query, params);
    
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error searching nearby users:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router; 