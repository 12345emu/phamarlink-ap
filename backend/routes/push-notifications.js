const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const pushNotificationService = require('../services/pushNotificationService');

const router = express.Router();

// Register device for push notifications
router.post('/register', [
  authenticateToken,
  body('token').isLength({ min: 1 }).withMessage('Push token is required'),
  body('deviceId').isLength({ min: 1 }).withMessage('Device ID is required'),
  body('platform').isIn(['ios', 'android', 'web']).withMessage('Platform must be ios, android, or web')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, deviceId, platform } = req.body;
    const userId = req.user.id;
    const userType = req.user.user_type;

    console.log('🔔 Push Notifications - Registering device:', { userId, userType, deviceId, platform });

    const result = await pushNotificationService.registerDevice({
      userId,
      userType,
      token,
      deviceId,
      platform
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('❌ Push Notifications - Error registering device:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Deactivate device token
router.delete('/deactivate', [
  authenticateToken,
  body('deviceId').isLength({ min: 1 }).withMessage('Device ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { deviceId } = req.body;
    const userId = req.user.id;

    console.log('🔔 Push Notifications - Deactivating device:', { userId, deviceId });

    const result = await pushNotificationService.deactivateDeviceToken(userId, deviceId);

    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('❌ Push Notifications - Error deactivating device:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send test notification to user
router.post('/test', [
  authenticateToken,
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title is required'),
  body('body').isLength({ min: 1, max: 1000 }).withMessage('Body is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, body, data } = req.body;
    const userId = req.user.id;

    console.log('🔔 Push Notifications - Sending test notification:', { userId, title, body });

    const notificationData = {
      title,
      body,
      data: data || {},
      sound: true,
      badge: 1
    };

    const result = await pushNotificationService.sendNotificationToUser(userId, notificationData);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        results: result.results
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('❌ Push Notifications - Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send notification to all doctors (admin only)
router.post('/notify-doctors', [
  authenticateToken,
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title is required'),
  body('body').isLength({ min: 1, max: 1000 }).withMessage('Body is required')
], async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, body, data } = req.body;

    console.log('🔔 Push Notifications - Sending notification to all doctors:', { title, body });

    const notificationData = {
      title,
      body,
      data: data || {},
      sound: true,
      badge: 1
    };

    const result = await pushNotificationService.sendNotificationToAllDoctors(notificationData);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        results: result.results
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('❌ Push Notifications - Error sending notification to doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's registered devices
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('🔔 Push Notifications - Getting devices for user:', userId);

    const tokens = await pushNotificationService.getUserPushTokens(userId);

    res.json({
      success: true,
      data: {
        devices: tokens.map(token => ({
          deviceId: token.device_id,
          platform: token.platform,
          token: token.token.substring(0, 20) + '...' // Mask token for security
        }))
      }
    });
  } catch (error) {
    console.error('❌ Push Notifications - Error getting devices:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
