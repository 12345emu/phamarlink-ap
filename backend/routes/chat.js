const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const { executeQuery, executeTransaction } = require('../config/database');

const router = express.Router();

// Get all chat conversations for a user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
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
    // Admin can see all conversations
    
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM chat_conversations cc
      ${whereClause}
    `;
    
    const conversationsQuery = `
      SELECT 
        cc.*,
        u.first_name, u.last_name, u.email, u.phone,
        hf.name as facility_name, hf.facility_type,
        (
          SELECT cm.message 
          FROM chat_messages cm 
          WHERE cm.conversation_id = cc.id 
          ORDER BY cm.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT cm.created_at 
          FROM chat_messages cm 
          WHERE cm.conversation_id = cc.id 
          ORDER BY cm.created_at DESC 
          LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) 
          FROM chat_messages cm 
          WHERE cm.conversation_id = cc.id 
          AND cm.is_read = false 
          AND cm.sender_id != ?
        ) as unread_count
      FROM chat_conversations cc
      JOIN users u ON cc.user_id = u.id
      JOIN healthcare_facilities hf ON cc.facility_id = hf.id
      ${whereClause}
      ORDER BY last_message_time DESC, cc.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [countResult] = await executeQuery(countQuery, params);
    const conversations = await executeQuery(conversationsQuery, [...params, userId, parseInt(limit), offset]);
    
    res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get conversation by ID with messages
router.get('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.user_type;
    
    // Check if conversation exists and user has access
    const [conversation] = await executeQuery(
      `SELECT cc.*, u.first_name, u.last_name, u.email, u.phone,
              hf.name as facility_name, hf.facility_type
       FROM chat_conversations cc
       JOIN users u ON cc.user_id = u.id
       JOIN healthcare_facilities hf ON cc.facility_id = hf.id
       WHERE cc.id = ?`,
      [id]
    );
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    // Check access permissions
    if (userRole === 'patient' && conversation.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if ((userRole === 'doctor' || userRole === 'pharmacist') && 
        !await checkFacilityAccess(userId, conversation.facility_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Get messages for this conversation
    const messagesQuery = `
      SELECT 
        cm.*,
        u.first_name, u.last_name, u.email, u.user_type
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.conversation_id = ?
      ORDER BY cm.created_at ASC
    `;
    
    const [messages] = await executeQuery(messagesQuery, [id]);
    
    // Mark messages as read for the current user
    if (messages.length > 0) {
      await executeQuery(
        `UPDATE chat_messages 
         SET is_read = true 
         WHERE conversation_id = ? 
         AND sender_id != ? 
         AND is_read = false`,
        [id, userId]
      );
    }
    
    res.json({ 
      success: true, 
      data: { 
        conversation, 
        messages 
      } 
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create new conversation
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
    const userId = req.user.id;
    
    // Check if facility exists and is active
    const [facility] = await executeQuery(
      'SELECT id, facility_type FROM healthcare_facilities WHERE id = ? AND is_active = true',
      [conversationData.facility_id]
    );
    
    if (!facility) {
      return res.status(404).json({ success: false, message: 'Facility not found' });
    }
    
    // Check if conversation already exists
    const [existing] = await executeQuery(
      'SELECT id FROM chat_conversations WHERE user_id = ? AND facility_id = ? AND status = "active"',
      [userId, conversationData.facility_id]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'An active conversation already exists with this facility' 
      });
    }
    
    // Create conversation and initial message
    const conversationId = await executeTransaction(async (connection) => {
      // Create conversation
      const conversationQuery = `
        INSERT INTO chat_conversations (
          user_id, facility_id, subject, message_type, status, created_at
        ) VALUES (?, ?, ?, ?, 'active', NOW())
      `;
      
      const [conversationResult] = await connection.execute(conversationQuery, [
        userId,
        conversationData.facility_id,
        conversationData.subject,
        conversationData.message_type || 'general'
      ]);
      
      const conversationId = conversationResult.insertId;
      
      // Create initial message
      const messageQuery = `
        INSERT INTO chat_messages (
          conversation_id, sender_id, message, message_type, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `;
      
      await connection.execute(messageQuery, [
        conversationId,
        userId,
        conversationData.initial_message,
        conversationData.message_type || 'general'
      ]);
      
      return conversationId;
    });
    
    res.status(201).json({ 
      success: true, 
      message: 'Conversation created successfully',
      data: { id: conversationId }
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Send message in conversation
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
    const userId = req.user.id;
    const userRole = req.user.user_type;
    
    // Check if conversation exists and user has access
    const [conversation] = await executeQuery(
      'SELECT * FROM chat_conversations WHERE id = ?',
      [id]
    );
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
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
    const messageQuery = `
      INSERT INTO chat_messages (
        conversation_id, sender_id, message, message_type, attachment_url, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    const [result] = await executeQuery(messageQuery, [
      id,
      userId,
      message,
      message_type,
      attachment_url || null
    ]);
    
    // Update conversation last_activity
    await executeQuery(
      'UPDATE chat_conversations SET last_activity = NOW() WHERE id = ?',
      [id]
    );
    
    res.status(201).json({ 
      success: true, 
      message: 'Message sent successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update conversation status
router.patch('/conversations/:id/status', authenticateToken, [
  body('status').isIn(['active', 'resolved', 'closed']),
  body('resolution_notes').optional().isLength({ max: 200 }).trim()
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
    const { status, resolution_notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.user_type;
    
    // Check if conversation exists and user has access
    const [conversation] = await executeQuery(
      'SELECT * FROM chat_conversations WHERE id = ?',
      [id]
    );
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    // Check access permissions
    if (userRole === 'patient' && conversation.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if ((userRole === 'doctor' || userRole === 'pharmacist') && 
        !await checkFacilityAccess(userId, conversation.facility_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Update conversation status
    const updateQuery = `
      UPDATE chat_conversations 
      SET status = ?, resolution_notes = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [status, resolution_notes || null, id]);
    
    res.json({ success: true, message: 'Conversation status updated successfully' });
  } catch (error) {
    console.error('Error updating conversation status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Mark messages as read
router.patch('/conversations/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if conversation exists and user has access
    const [conversation] = await executeQuery(
      'SELECT * FROM chat_conversations WHERE id = ?',
      [id]
    );
    
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    // Check access permissions
    if (conversation.user_id !== userId && 
        !await checkFacilityAccess(userId, conversation.facility_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Mark all unread messages as read
    await executeQuery(
      `UPDATE chat_messages 
       SET is_read = true 
       WHERE conversation_id = ? 
       AND sender_id != ? 
       AND is_read = false`,
      [id, userId]
    );
    
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get unread message count for user
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
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
      ${whereClause}
      WHERE cm.sender_id != ? AND cm.is_read = false
    `;
    
    const [result] = await executeQuery(query, [...params, userId]);
    
    res.json({ 
      success: true, 
      data: result[0] || { total_unread: 0, conversations_with_unread: 0 }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Helper function to check facility access
async function checkFacilityAccess(userId, facilityId) {
  const [facility] = await executeQuery(
    'SELECT id FROM healthcare_facilities WHERE id = ? AND user_id = ?',
    [facilityId, userId]
  );
  return facility.length > 0;
}

module.exports = router; 