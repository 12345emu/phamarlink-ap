const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');
const db = require('../config/database');

const router = express.Router();

// Get all notifications for a user
router.get('/', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['appointment', 'order', 'chat', 'system', 'reminder']).withMessage('Invalid notification type'),
  query('read').optional().isBoolean().withMessage('Read status must be boolean'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page = 1, limit = 20, type, read } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE n.user_id = ?';
    const params = [userId];

    // Check if deleted_at column exists, if not, don't filter by it
    // Most databases use notification_type, but some might use type
    // We'll try notification_type first, fallback to type if needed

    if (type) {
      whereClause += ' AND n.notification_type = ?';
      params.push(type);
    }

    if (read !== undefined) {
      whereClause += ' AND n.is_read = ?';
      params.push(read === 'true' ? 1 : 0);
    }

    const query = `
      SELECT 
        n.id, 
        n.notification_type as type,
        n.title, n.message, n.data, n.is_read, 
        n.created_at, n.read_at,
        u.id as user_id, u.first_name, u.last_name
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params];
    queryParams.push(parseInt(limit), offset);

    const notifications = await db.executeQuery(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications n
      ${whereClause}
    `;
    const countResult = await db.executeQuery(countQuery, params);
    const total = countResult.length > 0 && countResult[0].total !== undefined
      ? countResult[0].total
      : 0;

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification by ID
router.get('/:id', [
  authenticateToken,
  param('id').isInt().withMessage('Notification ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT 
        n.id, 
        n.notification_type as type,
        n.title, n.message, n.data, n.is_read, 
        n.created_at, n.read_at,
        u.id as user_id, u.first_name, u.last_name
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.id = ? AND n.user_id = ?
    `;

    const notifications = await db.executeQuery(query, [id, userId]);

    if (notifications.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification: notifications[0] });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.patch('/:id/read', [
  authenticateToken,
  param('id').isInt().withMessage('Notification ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Check if notification exists and belongs to user
    const existingNotification = await db.executeQuery(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existingNotification.length === 0) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }

    // Mark as read
    await db.executeQuery(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.patch('/read-all', [
  authenticateToken
], async (req, res) => {
  try {
    const userId = req.user.id;

    await db.executeQuery(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification (soft delete)
router.delete('/:id', [
  authenticateToken,
  param('id').isInt().withMessage('Notification ID must be an integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const userId = req.user.id;

    // Check if notification exists and belongs to user
    const existingNotification = await db.executeQuery(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existingNotification.length === 0) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }

    // Delete notification (hard delete since no deleted_at column in schema)
    await db.executeQuery(
      'DELETE FROM notifications WHERE id = ?',
      [id]
    );

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread notification count
router.get('/unread/count', [
  authenticateToken
], async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = ? AND is_read = 0
    `;

    const result = await db.executeQuery(query, [userId]);
    const unreadCount = result[0].unread_count || 0;

    res.json({ unread_count: unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create notification (admin/system use)
router.post('/', [
  authenticateToken,
  requireRole(['admin', 'system']),
  body('userId').isInt().withMessage('User ID must be an integer'),
  body('type').isIn(['appointment', 'order', 'chat', 'system', 'reminder']).withMessage('Invalid notification type'),
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  body('data').optional().isObject().withMessage('Data must be an object'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, type, title, message, data } = req.body;

    // Verify user exists
    const user = await db.executeQuery(
      'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
      [userId]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use notification_type if column exists, otherwise use type
    // Check which column exists by trying notification_type first
    const insertQuery = `
      INSERT INTO notifications (user_id, notification_type, title, message, data, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, NOW())
    `;

    const result = await db.executeQuery(insertQuery, [
      userId, 
      type, 
      title, 
      message, 
      data ? JSON.stringify(data) : null
    ]);

    // Get the created notification
    const newNotification = await db.executeQuery(
      'SELECT * FROM notifications WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ 
      message: 'Notification created successfully',
      notification: newNotification[0]
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk create notifications (admin/system use)
router.post('/bulk', [
  authenticateToken,
  requireRole(['admin', 'system']),
  body('notifications').isArray({ min: 1 }).withMessage('Notifications must be a non-empty array'),
  body('notifications.*.userId').isInt().withMessage('User ID must be an integer'),
  body('notifications.*.type').isIn(['appointment', 'order', 'chat', 'system', 'reminder']).withMessage('Invalid notification type'),
  body('notifications.*.title').isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('notifications.*.message').isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { notifications } = req.body;

    // Verify all users exist
    const userIds = notifications.map(n => n.userId);
    const uniqueUserIds = [...new Set(userIds)];
    
    const users = await db.executeQuery(
      'SELECT id FROM users WHERE id IN (?) AND deleted_at IS NULL',
      [uniqueUserIds]
    );

    if (users.length !== uniqueUserIds.length) {
      return res.status(400).json({ error: 'One or more users not found' });
    }

    // Insert all notifications
    const insertQuery = `
      INSERT INTO notifications (user_id, notification_type, title, message, data, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, NOW())
    `;

    const results = [];
    for (const notification of notifications) {
      const result = await db.executeQuery(insertQuery, [
        notification.userId,
        notification.type,
        notification.title,
        notification.message,
        notification.data ? JSON.stringify(notification.data) : null
      ]);
      results.push(result.insertId);
    }

    res.status(201).json({ 
      message: `${results.length} notifications created successfully`,
      notification_ids: results
    });
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification preferences for a user
router.get('/preferences', [
  authenticateToken
], async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT 
        np.appointment_notifications,
        np.order_notifications,
        np.chat_notifications,
        np.system_notifications,
        np.promotion_notifications,
        np.email_notifications,
        np.push_notifications,
        np.sms_notifications
      FROM notification_preferences np
      WHERE np.user_id = ?
    `;

    const preferences = await db.executeQuery(query, [userId]);

    if (preferences.length === 0) {
      // Return default preferences if none exist
      return res.json({
        appointment_notifications: true,
        order_notifications: true,
        chat_notifications: true,
        system_notifications: true,
        promotion_notifications: false,
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false
      });
    }

    res.json({ preferences: preferences[0] });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update notification preferences
router.put('/preferences', [
  authenticateToken,
  body('appointment_notifications').optional().isBoolean().withMessage('Appointment notifications must be boolean'),
  body('order_notifications').optional().isBoolean().withMessage('Order notifications must be boolean'),
  body('chat_notifications').optional().isBoolean().withMessage('Chat notifications must be boolean'),
  body('system_notifications').optional().isBoolean().withMessage('System notifications must be boolean'),
  body('promotion_notifications').optional().isBoolean().withMessage('Promotion notifications must be boolean'),
  body('email_notifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('push_notifications').optional().isBoolean().withMessage('Push notifications must be boolean'),
  body('sms_notifications').optional().isBoolean().withMessage('SMS notifications must be boolean'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const updateData = req.body;

    // Check if preferences exist
    const existingPreferences = await db.executeQuery(
      'SELECT id FROM notification_preferences WHERE user_id = ?',
      [userId]
    );

    if (existingPreferences.length === 0) {
      // Create new preferences
      const insertQuery = `
        INSERT INTO notification_preferences (
          user_id, appointment_notifications, order_notifications, chat_notifications,
          system_notifications, promotion_notifications, email_notifications,
          push_notifications, sms_notifications, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      await db.executeQuery(insertQuery, [
        userId,
        updateData.appointment_notifications ?? true,
        updateData.order_notifications ?? true,
        updateData.chat_notifications ?? true,
        updateData.system_notifications ?? true,
        updateData.promotion_notifications ?? false,
        updateData.email_notifications ?? true,
        updateData.push_notifications ?? true,
        updateData.sms_notifications ?? false
      ]);
    } else {
      // Update existing preferences
      const updateQuery = `
        UPDATE notification_preferences 
        SET 
          appointment_notifications = ?,
          order_notifications = ?,
          chat_notifications = ?,
          system_notifications = ?,
          promotion_notifications = ?,
          email_notifications = ?,
          push_notifications = ?,
          sms_notifications = ?,
          updated_at = NOW()
        WHERE user_id = ?
      `;

      await db.executeQuery(updateQuery, [
        updateData.appointment_notifications ?? true,
        updateData.order_notifications ?? true,
        updateData.chat_notifications ?? true,
        updateData.system_notifications ?? true,
        updateData.promotion_notifications ?? false,
        updateData.email_notifications ?? true,
        updateData.push_notifications ?? true,
        updateData.sms_notifications ?? false,
        userId
      ]);
    }

    res.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 