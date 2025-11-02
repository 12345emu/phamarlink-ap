const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { executeQuery } = require('../config/database');

const router = express.Router();

// Get all conversations for a user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.user.id);
    const userRole = req.user.user_type;
    
    let query = '';
    let params = [];
    
    if (userRole === 'patient') {
      query = `
        SELECT 
          cc.id, cc.user_id, cc.professional_id, cc.subject, cc.status, 
          cc.conversation_type, cc.last_activity, cc.created_at,
          u.first_name, u.last_name, u.profile_image as user_profile_image,
          p.first_name as professional_first_name, p.last_name as professional_last_name, 
          p.profile_image as professional_profile_image,
          hp.specialty,
          hf.name as facility_name, hf.facility_type,
          (SELECT cm.message FROM chat_messages cm 
           WHERE cm.conversation_id = cc.id 
           ORDER BY cm.created_at DESC LIMIT 1) as last_message,
          (SELECT cm.created_at FROM chat_messages cm 
           WHERE cm.conversation_id = cc.id 
           ORDER BY cm.created_at DESC LIMIT 1) as last_message_time,
          (SELECT COUNT(*) FROM chat_messages cm 
           WHERE cm.conversation_id = cc.id 
           AND cm.is_read = false AND cm.sender_id != ?) as unread_count
        FROM chat_conversations cc
        JOIN users u ON cc.user_id = u.id
        JOIN users p ON cc.professional_id = p.id
        LEFT JOIN healthcare_professionals hp ON cc.professional_id = hp.user_id
        LEFT JOIN healthcare_facilities hf ON hp.facility_id = hf.id
        WHERE cc.user_id = ?
        ORDER BY cc.last_activity DESC
      `;
      params = [userId, userId];
    } else if (userRole === 'doctor' || userRole === 'pharmacist') {
      query = `
        SELECT 
          cc.id, cc.user_id, cc.professional_id, cc.subject, cc.status, 
          cc.conversation_type, cc.last_activity, cc.created_at,
          u.first_name as user_first_name, u.last_name as user_last_name, u.profile_image as user_profile_image,
          p.first_name as professional_first_name, p.last_name as professional_last_name, 
          p.profile_image as professional_profile_image,
          hp.specialty,
          hf.name as facility_name, hf.facility_type,
          (SELECT cm.message FROM chat_messages cm 
           WHERE cm.conversation_id = cc.id 
           ORDER BY cm.created_at DESC LIMIT 1) as last_message,
          (SELECT cm.created_at FROM chat_messages cm 
           WHERE cm.conversation_id = cc.id 
           ORDER BY cm.created_at DESC LIMIT 1) as last_message_time,
          (SELECT COUNT(*) FROM chat_messages cm 
           WHERE cm.conversation_id = cc.id 
           AND cm.is_read = false AND cm.sender_id != ?) as unread_count
        FROM chat_conversations cc
        JOIN users u ON cc.user_id = u.id
        JOIN users p ON cc.professional_id = p.id
        LEFT JOIN healthcare_professionals hp ON cc.professional_id = hp.user_id
        LEFT JOIN healthcare_facilities hf ON hp.facility_id = hf.id
        WHERE cc.professional_id = ?
        ORDER BY cc.last_activity DESC
      `;
      params = [userId, userId];
    }
    
    const result = await executeQuery(query, params);
    
    if (!result.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch conversations',
        error: result.error
      });
    }
    
    // Construct full URLs for profile images
    const processedData = result.data.map(conversation => ({
      ...conversation,
      user_profile_image: conversation.user_profile_image 
        ? `http://172.20.10.4:3000${conversation.user_profile_image}`
        : null,
      professional_profile_image: conversation.professional_profile_image 
        ? `http://172.20.10.4:3000${conversation.professional_profile_image}`
        : null
    }));
    
    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get messages for a specific conversation
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.user.id);
    
    // Verify user has access to this conversation
    const accessQuery = `
      SELECT id FROM chat_conversations 
      WHERE id = ? AND (user_id = ? OR professional_id = ?)
    `;
    const accessResult = await executeQuery(accessQuery, [id, userId, userId]);
    
    if (!accessResult.success || accessResult.data.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this conversation' 
      });
    }
    
    // Get messages
    const messagesQuery = `
      SELECT 
        cm.id, cm.conversation_id, cm.sender_id, cm.message, 
        cm.message_type, cm.attachment_url, cm.is_read, cm.read_at, cm.created_at,
        u.first_name, u.last_name, u.user_type, u.profile_image as user_profile_image
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.conversation_id = ?
      ORDER BY cm.created_at ASC
    `;
    
    const messagesResult = await executeQuery(messagesQuery, [id]);
    
    if (!messagesResult.success) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch messages',
        error: messagesResult.error
      });
    }
    
    // Construct full URLs for profile images in messages
    const processedMessages = messagesResult.data.map(message => ({
      ...message,
      user_profile_image: message.user_profile_image 
        ? `http://172.20.10.4:3000${message.user_profile_image}`
        : null
    }));
    
    res.json({
      success: true,
      data: processedMessages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Create new conversation
// Patient creates conversation with doctor
router.post('/conversations', authenticateToken, requireRole(['patient']), [
  body('professional_id').isInt({ min: 1 }),
  body('subject').isLength({ min: 1, max: 100 }).trim(),
  body('initial_message').isLength({ min: 1, max: 500 }).trim()
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
    
    const { professional_id, subject, initial_message } = req.body;
    const userId = parseInt(req.user.id);
    
    // Check if conversation already exists
    const existingQuery = `
      SELECT id FROM chat_conversations 
      WHERE user_id = ? AND professional_id = ? AND status = 'active'
    `;
    const existingResult = await executeQuery(existingQuery, [userId, professional_id]);
    
    if (existingResult.success && existingResult.data.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Conversation already exists with this professional',
        conversationId: existingResult.data[0].id
      });
    }
    
    // Verify professional exists
    const professionalQuery = `
      SELECT hp.*, hf.id as facility_id, hf.name as facility_name, hf.facility_type
      FROM healthcare_professionals hp
      LEFT JOIN healthcare_facilities hf ON hp.facility_id = hf.id
      WHERE hp.id = ? AND hp.is_active = true
    `;
    const professionalResult = await executeQuery(professionalQuery, [professional_id]);
    
    if (!professionalResult.success || professionalResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Professional not found or inactive'
      });
    }
    
    const professional = professionalResult.data[0];
    const facilityId = professional.facility_id || 1;
    
    // Create conversation
    const conversationQuery = `
      INSERT INTO chat_conversations (
        user_id, facility_id, patient_id, professional_id, subject, 
        conversation_type, status, created_at, last_activity
      ) VALUES (?, ?, ?, ?, ?, 'general', 'active', NOW(), NOW())
    `;
    const conversationResult = await executeQuery(conversationQuery, [
      userId, facilityId, userId, professional_id, subject
    ]);
    
    if (!conversationResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create conversation'
      });
    }
    
    const conversationId = conversationResult.data.insertId;
    
    // Create initial message
    const messageQuery = `
      INSERT INTO chat_messages (
        conversation_id, sender_id, message, message_type, created_at
      ) VALUES (?, ?, ?, 'text', NOW())
    `;
    const messageResult = await executeQuery(messageQuery, [
      conversationId, userId, initial_message
    ]);
    
    if (!messageResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create initial message'
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: {
        conversationId: conversationId,
        messageId: messageResult.data.insertId
      }
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Doctor creates conversation with patient
router.post('/doctor-conversations', authenticateToken, requireRole(['doctor', 'pharmacist']), [
  body('patient_id').isInt({ min: 1 }),
  body('subject').isLength({ min: 1, max: 100 }).trim(),
  body('initial_message').isLength({ min: 1, max: 500 }).trim()
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
    
    const { patient_id, subject, initial_message } = req.body;
    const doctorId = parseInt(req.user.id);
    
    console.log('🔍 Doctor creating conversation:', { doctorId, patient_id, subject });
    
    // Check if conversation already exists between this doctor and patient
    const existingQuery = `
      SELECT id FROM chat_conversations 
      WHERE professional_id = ? AND user_id = ?
    `;
    const existingResult = await executeQuery(existingQuery, [doctorId, patient_id]);
    
    let conversationId;
    
    if (existingResult.success && existingResult.data.length > 0) {
      // Conversation already exists, use existing one
      conversationId = existingResult.data[0].id;
      console.log('✅ Using existing conversation:', conversationId);
      
      // Add message to existing conversation
      const messageQuery = `
        INSERT INTO chat_messages (
          conversation_id, sender_id, message, message_type, is_read, created_at
        ) VALUES (?, ?, ?, 'text', false, NOW())
      `;
      const messageResult = await executeQuery(messageQuery, [conversationId, doctorId, initial_message]);
      
      if (!messageResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send message to existing conversation'
        });
      }
      
      console.log('✅ Message added to existing conversation:', conversationId);
      
      res.json({
        success: true,
        data: {
          id: conversationId,
          conversation_id: conversationId,
          message: 'Message sent to existing conversation'
        }
      });
    } else {
      // Create new conversation
      const conversationQuery = `
        INSERT INTO chat_conversations (
          user_id, patient_id, professional_id, subject, conversation_type, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'consultation', 'active', NOW(), NOW())
      `;
      const conversationResult = await executeQuery(conversationQuery, [patient_id, patient_id, doctorId, subject]);
      
      if (!conversationResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create conversation'
        });
      }
      
      conversationId = conversationResult.data.insertId;
      
      // Add initial message
      const messageQuery = `
        INSERT INTO chat_messages (
          conversation_id, sender_id, message, message_type, is_read, created_at
        ) VALUES (?, ?, ?, 'text', false, NOW())
      `;
      const messageResult = await executeQuery(messageQuery, [conversationId, doctorId, initial_message]);
      
      if (!messageResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send initial message'
        });
      }
      
      console.log('✅ New doctor conversation created:', conversationId);
      
      res.json({
        success: true,
        data: {
          id: conversationId,
          conversation_id: conversationId,
          message: 'New conversation created successfully'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating doctor conversation:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Send message (this will be handled by WebSocket, but we keep this for fallback)
router.post('/conversations/:id/messages', authenticateToken, [
  body('message').isLength({ min: 1, max: 500 }).trim(),
  body('message_type').optional().isIn(['text', 'image', 'file'])
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
    const { message, message_type = 'text' } = req.body;
    const userId = parseInt(req.user.id);
    
    // Verify user has access to this conversation
    const accessQuery = `
      SELECT id FROM chat_conversations 
      WHERE id = ? AND (user_id = ? OR professional_id = ?)
    `;
    const accessResult = await executeQuery(accessQuery, [id, userId, userId]);
    
    if (!accessResult.success || accessResult.data.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this conversation' 
      });
    }
    
    // Insert message
    const messageQuery = `
      INSERT INTO chat_messages (
        conversation_id, sender_id, message, message_type, created_at
      ) VALUES (?, ?, ?, ?, NOW())
    `;
    const messageResult = await executeQuery(messageQuery, [id, userId, message, message_type]);
    
    if (!messageResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send message'
      });
    }
    
    // Update conversation last activity
    const updateQuery = `
      UPDATE chat_conversations 
      SET last_activity = NOW() 
      WHERE id = ?
    `;
    await executeQuery(updateQuery, [id]);
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: messageResult.data.insertId
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Mark messages as read
router.put('/conversations/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(req.user.id);
    
    // Verify user has access to this conversation
    const accessQuery = `
      SELECT id FROM chat_conversations 
      WHERE id = ? AND (user_id = ? OR professional_id = ?)
    `;
    const accessResult = await executeQuery(accessQuery, [id, userId, userId]);
    
    if (!accessResult.success || accessResult.data.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied to this conversation' 
      });
    }
    
    // Mark messages as read
    const readQuery = `
      UPDATE chat_messages 
      SET is_read = true, read_at = NOW() 
      WHERE conversation_id = ? AND sender_id != ? AND is_read = false
    `;
    const readResult = await executeQuery(readQuery, [id, userId]);
    
    if (!readResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to mark messages as read'
      });
    }
    
    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;


