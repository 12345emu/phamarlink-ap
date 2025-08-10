const express = require('express');
const { query, validationResult } = require('express-validator');
const db = require('../config/database');
const os = require('os');

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await db.testConnection();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: {
          loadAverage: os.loadavg(),
          cores: os.cpus().length
        }
      }
    };

    if (!dbStatus) {
      healthData.status = 'degraded';
      healthData.database.status = 'error';
    }

    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error.message
    });
  }
});

// System information endpoint
router.get('/system-info', async (req, res) => {
  try {
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100,
        free: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100,
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024 * 100) / 100
      },
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length,
        loadAverage: os.loadavg()
      },
      network: {
        interfaces: Object.keys(os.networkInterfaces()).reduce((acc, interface) => {
          acc[interface] = os.networkInterfaces()[interface].map(addr => ({
            address: addr.address,
            family: addr.family,
            internal: addr.internal
          }));
          return acc;
        }, {})
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || '3000',
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_NAME: process.env.DB_NAME || 'pharmalink'
      }
    };

    res.json(systemInfo);
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({ error: 'Failed to get system information' });
  }
});

// Database statistics endpoint
router.get('/db-stats', async (req, res) => {
  try {
    const stats = {};

    // Get table row counts
    const tables = [
      'users', 'patient_profiles', 'healthcare_facilities', 'medicines',
      'pharmacy_medicines', 'appointments', 'orders', 'order_items',
      'chat_conversations', 'chat_messages', 'reviews', 'notifications'
    ];

    for (const table of tables) {
      try {
        const result = await db.executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = result[0].count;
      } catch (error) {
        stats[table] = 'error';
        console.error(`Error counting ${table}:`, error);
      }
    }

    // Get database size info (MySQL specific)
    try {
      const dbSizeQuery = `
        SELECT 
          table_schema AS 'database',
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'size_mb'
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        GROUP BY table_schema
      `;
      const dbSizeResult = await db.executeQuery(dbSizeQuery);
      stats.database_size_mb = dbSizeResult[0]?.size_mb || 0;
    } catch (error) {
      stats.database_size_mb = 'error';
      console.error('Error getting database size:', error);
    }

    // Get recent activity (last 24 hours)
    try {
      const recentActivityQuery = `
        SELECT 
          'users' as table_name,
          COUNT(*) as count
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        UNION ALL
        SELECT 
          'appointments' as table_name,
          COUNT(*) as count
        FROM appointments 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        UNION ALL
        SELECT 
          'orders' as table_name,
          COUNT(*) as count
        FROM orders 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        UNION ALL
        SELECT 
          'reviews' as table_name,
          COUNT(*) as count
        FROM reviews 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `;
      const recentActivity = await db.executeQuery(recentActivityQuery);
      stats.recent_activity_24h = recentActivity.reduce((acc, row) => {
        acc[row.table_name] = row.count;
        return acc;
      }, {});
    } catch (error) {
      stats.recent_activity_24h = 'error';
      console.error('Error getting recent activity:', error);
    }

    res.json({
      timestamp: new Date().toISOString(),
      statistics: stats
    });
  } catch (error) {
    console.error('Database stats error:', error);
    res.status(500).json({ error: 'Failed to get database statistics' });
  }
});

// Data validation endpoint
router.post('/validate', [
  query('type').isIn(['email', 'phone', 'password', 'username']).withMessage('Invalid validation type'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type } = req.query;
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({ error: 'Value is required' });
    }

    let isValid = false;
    let message = '';

    switch (type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(value);
        message = isValid ? 'Valid email address' : 'Invalid email format';
        break;

      case 'phone':
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        isValid = phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
        message = isValid ? 'Valid phone number' : 'Invalid phone number format';
        break;

      case 'password':
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        isValid = passwordRegex.test(value);
        message = isValid ? 'Strong password' : 'Password must be at least 8 characters with uppercase, lowercase, and number';
        break;

      case 'username':
        // 3-20 characters, alphanumeric and underscore only
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        isValid = usernameRegex.test(value);
        message = isValid ? 'Valid username' : 'Username must be 3-20 characters, alphanumeric and underscore only';
        break;

      default:
        return res.status(400).json({ error: 'Invalid validation type' });
    }

    res.json({
      type,
      value,
      isValid,
      message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// File upload validation endpoint
router.post('/validate-file', [
  query('type').isIn(['image', 'document', 'prescription']).withMessage('Invalid file type'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type } = req.query;
    const { filename, size, mimetype } = req.body;

    if (!filename || !size || !mimetype) {
      return res.status(400).json({ error: 'File information is required' });
    }

    const maxSizes = {
      image: 5 * 1024 * 1024, // 5MB
      document: 10 * 1024 * 1024, // 10MB
      prescription: 2 * 1024 * 1024 // 2MB
    };

    const allowedMimeTypes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      prescription: ['image/jpeg', 'image/png', 'application/pdf']
    };

    const validation = {
      filename,
      size: parseInt(size),
      mimetype,
      isValid: true,
      errors: []
    };

    // Check file size
    if (parseInt(size) > maxSizes[type]) {
      validation.isValid = false;
      validation.errors.push(`File size exceeds maximum allowed size of ${Math.round(maxSizes[type] / 1024 / 1024)}MB`);
    }

    // Check MIME type
    if (!allowedMimeTypes[type].includes(mimetype)) {
      validation.isValid = false;
      validation.errors.push(`File type ${mimetype} is not allowed for ${type} uploads`);
    }

    // Check filename extension
    const allowedExtensions = {
      image: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      document: ['.pdf', '.doc', '.docx'],
      prescription: ['.jpg', '.jpeg', '.png', '.pdf']
    };

    const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (!allowedExtensions[type].includes(fileExtension)) {
      validation.isValid = false;
      validation.errors.push(`File extension ${fileExtension} is not allowed for ${type} uploads`);
    }

    res.json({
      type,
      validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('File validation error:', error);
    res.status(500).json({ error: 'File validation failed' });
  }
});

// Generate unique ID endpoint
router.get('/generate-id', [
  query('type').isIn(['user', 'order', 'appointment', 'medicine']).withMessage('Invalid ID type'),
  query('prefix').optional().isLength({ min: 1, max: 10 }).withMessage('Prefix must be 1-10 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, prefix } = req.query;
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    
    let idPrefix = prefix || type.substring(0, 3).toUpperCase();
    const uniqueId = `${idPrefix}-${timestamp}-${random}`.toUpperCase();

    res.json({
      type,
      id: uniqueId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('ID generation error:', error);
    res.status(500).json({ error: 'Failed to generate ID' });
  }
});

// Cache status endpoint
router.get('/cache-status', async (req, res) => {
  try {
    // This is a placeholder - in a real app you'd check Redis or other cache status
    const cacheStatus = {
      status: 'not_implemented',
      message: 'Cache system not yet implemented',
      timestamp: new Date().toISOString()
    };

    res.json(cacheStatus);
  } catch (error) {
    console.error('Cache status error:', error);
    res.status(500).json({ error: 'Failed to get cache status' });
  }
});

// API rate limit status endpoint
router.get('/rate-limit-status', (req, res) => {
  try {
    // This would typically come from your rate limiting middleware
    const rateLimitStatus = {
      current_requests: 0,
      max_requests: 100,
      window_ms: 900000, // 15 minutes
      reset_time: new Date(Date.now() + 900000).toISOString(),
      timestamp: new Date().toISOString()
    };

    res.json(rateLimitStatus);
  } catch (error) {
    console.error('Rate limit status error:', error);
    res.status(500).json({ error: 'Failed to get rate limit status' });
  }
});

module.exports = router; 