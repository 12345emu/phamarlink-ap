const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const ChatSocketServer = require('./websocket/chatSocket');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const facilityRoutes = require('./routes/facilities');
const medicineRoutes = require('./routes/medicines');
const professionalRoutes = require('./routes/professionals');
const appointmentRoutes = require('./routes/appointments');
const orderRoutes = require('./routes/orders');
const chatRoutes = require('./routes/chat-optimized'); // Use optimized chat routes
const reviewRoutes = require('./routes/reviews');
const notificationRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search');
const utilRoutes = require('./routes/utils');
const cartRoutes = require('./routes/cart');
const trackingRoutes = require('./routes/tracking');
const prescriptionRoutes = require('./routes/prescriptions');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebSocket server
const chatSocketServer = new ChatSocketServer(server);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - more aggressive for chat endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 chat requests per minute
  message: 'Too many chat requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Slow down middleware for additional protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: 500 // begin adding 500ms of delay per request above 50
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/chat/', chatLimiter);
app.use(speedLimiter);

// Body parsing middleware with size limits
app.use(express.json({ limit: '5mb' })); // Reduced from 10mb
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware (optimized)
app.use((req, res, next) => {
  // Only log in development or for important endpoints
  if (process.env.NODE_ENV === 'development' || 
      req.path.includes('/api/chat/') || 
      req.path.includes('/api/auth/')) {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'PharmaLink API with WebSocket is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    websocket: 'enabled',
    onlineUsers: chatSocketServer.getOnlineUsersCount()
  });
});

// WebSocket status endpoint
app.get('/ws/status', (req, res) => {
  res.json({
    websocket: 'enabled',
    onlineUsers: chatSocketServer.getOnlineUsersCount(),
    activeConversations: chatSocketServer.rooms ? chatSocketServer.rooms.size : 0
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/utils', utilRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/prescriptions', prescriptionRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Global error:', error);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`🛑 ${signal} received, shutting down gracefully`);
  
  // Close WebSocket connections
  if (chatSocketServer && chatSocketServer.wss) {
    chatSocketServer.wss.close(() => {
      console.log('🔌 WebSocket server closed');
    });
  }
  
  // Close HTTP server
  server.close(() => {
    console.log('🔌 HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Cannot start server without database connection');
      process.exit(1);
    }
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 PharmaLink API Server with WebSocket Started!');
      console.log(`📍 Server running on: http://0.0.0.0:${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket status: http://localhost:${PORT}/ws/status`);
      console.log(`📊 API Base URL: http://172.20.10.3:${PORT}/api`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⚡ WebSocket: ws://172.20.10.3:${PORT}/ws/chat`);
      console.log('⏰ Started at:', new Date().toLocaleString());
      console.log('🔧 Features: Real-time chat, Optimized queries, Rate limiting');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
