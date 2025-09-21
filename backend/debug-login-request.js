const express = require('express');
const app = express();

// Middleware to log all requests
app.use(express.json());
app.use((req, res, next) => {
  console.log('🔍 Incoming request:');
  console.log('📋 Method:', req.method);
  console.log('🔗 URL:', req.url);
  console.log('📤 Headers:', req.headers);
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  console.log('📊 Body type:', typeof req.body);
  console.log('📊 Body keys:', Object.keys(req.body || {}));
  
  if (req.body.email) {
    console.log('📧 Email value:', `"${req.body.email}"`);
    console.log('📧 Email length:', req.body.email.length);
    console.log('📧 Email type:', typeof req.body.email);
  }
  
  if (req.body.password) {
    console.log('🔑 Password value:', `"${req.body.password}"`);
    console.log('🔑 Password length:', req.body.password.length);
    console.log('🔑 Password type:', typeof req.body.password);
  }
  
  next();
});

// Simple login endpoint for debugging
app.post('/api/auth/login', (req, res) => {
  console.log('🎯 Login endpoint hit!');
  
  const { email, password } = req.body;
  
  // Basic validation
  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed - email is required',
      errors: [{ field: 'email', message: 'Email is required' }]
    });
  }
  
  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed - password is required',
      errors: [{ field: 'password', message: 'Password is required' }]
    });
  }
  
  if (!email.includes('@')) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed - invalid email format',
      errors: [{ field: 'email', message: 'Invalid email format' }]
    });
  }
  
  // Check against test user
  if (email === 'test@example.com' && password === 'password123') {
    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient'
        },
        token: 'debug-token-123',
        refreshToken: 'debug-refresh-token-123'
      }
    });
  }
  
  res.status(401).json({
    success: false,
    message: 'Invalid credentials'
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🔧 Debug server running on port ${PORT}`);
  console.log(`🔗 Test URL: http://localhost:${PORT}/api/auth/login`);
  console.log('📱 Use this URL in your app to debug the request');
});

