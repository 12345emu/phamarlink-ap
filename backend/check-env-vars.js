#!/usr/bin/env node

/**
 * Environment Variables Check Script
 * Shows what email environment variables are currently loaded
 */

require('dotenv').config();

console.log('🔍 Checking Email Environment Variables');
console.log('=====================================\n');

console.log('Environment Variables:');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
console.log('EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT SET');
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***SET***' : 'NOT SET');

console.log('\n📧 Current Email Configuration:');
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'ericayesu99@gmail.com',
    pass: process.env.EMAIL_PASS || 'sklo nuxl aqbg bzhz'
  }
};

console.log('Host:', emailConfig.host);
console.log('Port:', emailConfig.port);
console.log('Secure:', emailConfig.secure);
console.log('User:', emailConfig.auth.user);
console.log('Has Password:', !!emailConfig.auth.pass);

console.log('\n📁 .env file location:', require('path').resolve('.env'));

// Check if .env file exists
const fs = require('fs');
const envPath = '.env';
if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  console.log('\n📝 .env file contents:');
  lines.forEach(line => {
    if (line.includes('EMAIL_')) {
      const [key, value] = line.split('=');
      if (key && value) {
        if (key.includes('PASS')) {
          console.log(`${key}=${value.length > 0 ? '***SET***' : 'EMPTY'}`);
        } else {
          console.log(`${key}=${value}`);
        }
      }
    }
  });
} else {
  console.log('❌ .env file does not exist');
}
