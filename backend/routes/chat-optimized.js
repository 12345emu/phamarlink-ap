const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { executeQuery, executeTransaction } = require('../config/database');

const router = express.Router();

// Optimized: Get conversations with minimal data and pagination
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = parseInt(req.user.id);
    const userRole = req.user.user_type;
    
    // Build optimized query with proper indexing
    let whereClause = '';
    let params = [];
    
    if (userRole === 'patient') {
      whereClause = 'WHERE cc.user_id = ?';
      params.push(userId);
    } else if (userRole === 'doctor' || userRole === 'pharmacist') {
      whereClause = 'WHERE cc.facility_id IN (SELECT id FROM healthcare_facilities WHERE user_id = ?)';
      params.push(userId);
    }
    
    // Optimized query - get only essential data
    const conversationsQuery = `
      SELECT 
        cc.id, cc.user_id, cc.facility_id, cc.subject, cc.status, 
        cc.conversation_type, cc.last_activity, cc.created_at,
        u.first_name, u.last_name,
        hf.name as facility_name, hf.facility_type,
        hp.first_name as professional_first_name, hp.last_name as professional_last_name, hp.profile_image as professional_profile_image,
        -- Get last message efficiently
        (SELECT cm.message FROM chat_messages cm 
         WHERE cm.conversation_id = cc.id 
         ORDER BY cm.created_at DESC LIMIT 1) as last_message,
        (SELECT cm.created_at FROM chat_messages cm 
         WHERE cm.conversation_id = cc.id 
         ORDER BY cm.created_at DESC LIMIT 1) as last_message_time,
        -- Get unread count efficiently
        (SELECT COUNT(*) FROM chat_messages cm 
         WHERE cm.conversation_id = cc.id 
         AND cm.is_read = false AND cm.sender_id != ?) as unread_count
      FROM chat_conversations cc
      JOIN users u ON cc.user_id = u.id
      LEFT JOIN healthcare_facilities hf ON cc.facility_id = hf.id
      LEFT JOIN healthcare_professionals hp ON cc.professional_id = hp.id
      ${whereClause || 'WHERE 1=1'}
      ORDER BY cc.last_activity DESC, cc.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const conversationsResult = await executeQuery(conversationsQuery, [...params, userId, parseInt(limit), offset]);
    
    if (!conversationsResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database query failed',
        error: conversationsResult.error
      });
    }
    
    // Get total count efficiently
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM chat_conversations cc
      ${whereClause || 'WHERE 1=1'}
    `;
    
    const countResult = await executeQuery(countQuery, params);
    const total = countResult.success ? countResult.data[0].total : 0;
    
    res.json({
      success: true,
      data: {
        conversations: conversationsResult.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Optimized: Get conversation with messages (paginated)
router.get('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query; // Limit messages per page
    const offset = (page - 1) * limit;
    const userId = parseInt(req.user.id);
    const userRole = req.user.user_type;
    
    // Verify access first
    const accessResult = await executeQuery(
      `SELECT cc.*, u.user_type 
       FROM chat_conversations cc 
       JOIN users u ON cc.user_id = u.id 
       WHERE cc.id = ?`,
      [id]
    );
    
    if (!accessResult.success || accessResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    const conversation = accessResult.data[0];
    
    // Check access permissions
    if (userRole === 'patient' && conversation.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if ((userRole === 'doctor' || userRole === 'pharmacist') && 
        !await checkFacilityAccess(userId, conversation.facility_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Get conversation details with minimal joins
    const conversationQuery = `
      SELECT 
        cc.*,
        u.first_name, u.last_name, u.email, u.phone,
        hf.name as facility_name, hf.facility_type,
        hp.first_name as professional_first_name, hp.last_name as professional_last_name, hp.specialty, hp.profile_image as professional_profile_image
      FROM chat_conversations cc
      JOIN users u ON cc.user_id = u.id
      LEFT JOIN healthcare_facilities hf ON cc.facility_id = hf.id
      LEFT JOIN healthcare_professionals hp ON cc.professional_id = hp.id
      WHERE cc.id = ?
    `;
    
    const conversationResult = await executeQuery(conversationQuery, [id]);
    
    if (!conversationResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch conversation',
        error: conversationResult.error
      });
    }
    
    // Get messages with pagination
    const messagesQuery = `
      SELECT 
        cm.id, cm.conversation_id, cm.sender_id, cm.message, 
        cm.message_type, cm.attachment_url, cm.is_read, cm.read_at, cm.created_at,
        u.first_name, u.last_name, u.user_type, u.profile_image as user_profile_image
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.conversation_id = ?
      ORDER BY cm.created_at ASC
      LIMIT ? OFFSET ?
    `;
    
    const messagesResult = await executeQuery(messagesQuery, [id, parseInt(limit), offset]);
    
    if (!messagesResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch messages',
        error: messagesResult.error
      });
    }
    
    // Get total message count
    const messageCountResult = await executeQuery(
      'SELECT COUNT(*) as total FROM chat_messages WHERE conversation_id = ?',
      [id]
    );
    
    const totalMessages = messageCountResult.success ? messageCountResult.data[0].total : 0;
    
    // Mark messages as read for current user (async, don't wait)
    executeQuery(
      `UPDATE chat_messages 
       SET is_read = true, read_at = NOW() 
       WHERE conversation_id = ? AND sender_id != ? AND is_read = false`,
      [id, userId]
    ).catch(error => console.error('Error marking messages as read:', error));
    
    res.json({ 
      success: true, 
      data: { 
        conversation: conversationResult.data[0],
        messages: messagesResult.data, // Already ordered oldest first
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalMessages,
          pages: Math.ceil(totalMessages / limit)
        }
      } 
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Optimized: Create conversation with validation
router.post('/conversations', authenticateToken, requireRole(['patient']), [
  body('facility_id').isInt({ min: 1 }),
  body('subject').isLength({ min: 5, max: 100 }).trim(),
  body('initial_message').isLength({ min: 10, max: 500 }).trim(),
  body('message_type').optional().isIn(['general', 'prescription', 'appointment', 'emergency'])
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
    
    const conversationData = req.body;
    const userId = parseInt(req.user.id);
    
    // Use transaction for data consistency
    const result = await executeTransaction(async (connection) => {
      // Check if conversation already exists
      const existingResult = await connection.execute(
        'SELECT id FROM chat_conversations WHERE user_id = ? AND facility_id = ? AND status = "active"',
        [userId, conversationData.facility_id]
      );
      
      if (existingResult[0].length > 0) {
        throw new Error('An active conversation already exists with this facility');
      }
      
      // Validate facility exists
      const facilityResult = await connection.execute(
        'SELECT id, facility_type FROM healthcare_facilities WHERE id = ? AND is_active = true',
        [conversationData.facility_id]
      );
      
      if (facilityResult[0].length === 0) {
        throw new Error('Facility not found or inactive');
      }
      
      const facility = facilityResult[0][0];
      
      // Find professional for this facility
      let professionalId = null;
      if (facility.facility_type === 'freelancer') {
        professionalId = conversationData.facility_id;
      } else {
        const professionalResult = await connection.execute(
          'SELECT id FROM healthcare_professionals WHERE facility_id = ? AND is_verified = true LIMIT 1',
          [conversationData.facility_id]
        );
        
        if (professionalResult[0].length === 0) {
          throw new Error('No verified professional available at this facility');
        }
        
        professionalId = professionalResult[0][0].id;
      }
      
      // Create conversation
      const conversationResult = await connection.execute(
        `INSERT INTO chat_conversations (
          user_id, facility_id, patient_id, professional_id, subject, 
          conversation_type, status, created_at, last_activity
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [
          userId,
          conversationData.facility_id,
          userId,
          professionalId,
          conversationData.subject,
          conversationData.message_type || 'general'
        ]
      );
      
      const conversationId = conversationResult[0].insertId;
      
      // Create initial message
      const messageResult = await connection.execute(
        `INSERT INTO chat_messages (
          conversation_id, sender_id, message, message_type, created_at
        ) VALUES (?, ?, ?, ?, NOW())`,
        [
          conversationId,
          userId,
          conversationData.initial_message,
          conversationData.message_type || 'general'
        ]
      );
      
      return { conversationId, messageId: messageResult[0].insertId };
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Conversation created successfully',
      data: { 
        conversationId: result.conversationId,
        messageId: result.messageId
      }
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create conversation',
      error: error.message
    });
  }
});

// Optimized: Send message (now handled by WebSocket, but keep for fallback)
router.post('/conversations/:id/messages', authenticateToken, [
  body('message').isLength({ min: 1, max: 500 }).trim(),
  body('message_type').optional().isIn(['text', 'image', 'file', 'prescription']),
  body('attachment_url').optional().isURL()
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
    const { message, message_type = 'text', attachment_url } = req.body;
    const userId = parseInt(req.user.id);
    const userRole = req.user.user_type;
    
    // Quick access check
    const accessResult = await executeQuery(
      'SELECT user_id, facility_id, status FROM chat_conversations WHERE id = ?',
      [id]
    );
    
    if (!accessResult.success || accessResult.data.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    const conversation = accessResult.data[0];
    
    if (conversation.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Conversation is not active' });
    }
    
    // Check access permissions
    if (userRole === 'patient' && conversation.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if ((userRole === 'doctor' || userRole === 'pharmacist') && 
        !await checkFacilityAccess(userId, conversation.facility_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Create message
    const messageResult = await executeQuery(
      `INSERT INTO chat_messages (
        conversation_id, sender_id, message, message_type, attachment_url, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [id, userId, message, message_type, attachment_url || null]
    );
    
    if (!messageResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send message',
        error: messageResult.error
      });
    }
    
    // Update conversation last_activity (async)
    executeQuery(
      'UPDATE chat_conversations SET last_activity = NOW() WHERE id = ?',
      [id]
    ).catch(error => console.error('Error updating last activity:', error));
    
    res.status(201).json({ 
      success: true, 
      message: 'Message sent successfully',
      data: { id: messageResult.data.insertId }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Optimized: Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.user.id);
    const userRole = req.user.user_type;
    
    let whereClause = '';
    let params = [];
    
    if (userRole === 'patient') {
      whereClause = 'WHERE cc.user_id = ?';
      params.push(userId);
    } else if (userRole === 'doctor' || userRole === 'pharmacist') {
      whereClause = 'WHERE cc.facility_id IN (SELECT id FROM healthcare_facilities WHERE user_id = ?)';
      params.push(userId);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_unread,
        COUNT(DISTINCT cc.id) as conversations_with_unread
      FROM chat_messages cm
      JOIN chat_conversations cc ON cm.conversation_id = cc.id
      ${whereClause ? whereClause + ' AND' : 'WHERE'} cm.sender_id != ? AND cm.is_read = false
    `;
    
    const result = await executeQuery(query, [...params, userId]);
    
    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to get unread count',
        error: result.error
      });
    }
    
    res.json({ 
      success: true, 
      data: result.data[0] || { total_unread: 0, conversations_with_unread: 0 }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Mark conversation as read
router.patch('/conversations/:id/read', authenticateToken, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = parseInt(req.user.id);
    const userRole = req.user.user_type;
    
    // Verify user has access to this conversation
    let accessQuery = '';
    let accessParams = [];
    
    if (userRole === 'patient') {
      accessQuery = 'SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?';
      accessParams = [conversationId, userId];
    } else if (userRole === 'doctor' || userRole === 'pharmacist') {
      accessQuery = `
        SELECT cc.id FROM chat_conversations cc
        JOIN healthcare_facilities hf ON cc.facility_id = hf.id
        WHERE cc.id = ? AND hf.user_id = ?
      `;
      accessParams = [conversationId, userId];
    }
    
    const accessResult = await executeQuery(accessQuery, accessParams);
    
    if (!accessResult.success || !accessResult.data.length) {
      return res.status(404).json({ 
        success: false, 
        message: 'Conversation not found or access denied' 
      });
    }
    
    // Mark messages as read
    const updateQuery = `
      UPDATE chat_messages 
      SET is_read = true, read_at = NOW()
      WHERE conversation_id = ? AND sender_id != ? AND is_read = false
    `;
    
    const updateResult = await executeQuery(updateQuery, [conversationId, userId]);
    
    if (!updateResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to mark messages as read',
        error: updateResult.error
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Messages marked as read',
      data: { updated_count: updateResult.data.affectedRows || 0 }
    });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Helper function to check facility access
async function checkFacilityAccess(userId, facilityId) {
  try {
    const facilityResult = await executeQuery(
      'SELECT id FROM healthcare_facilities WHERE id = ? AND user_id = ?',
      [facilityId, userId]
    );
    return facilityResult.success && facilityResult.data.length > 0;
  } catch (error) {
    console.error('Error checking facility access:', error);
    return false;
  }
}

module.exports = router;
