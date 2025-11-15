// Test script to verify Hostinger SMTP connection
require('dotenv').config();
const nodemailer = require('nodemailer');

const email = process.env.EMAIL_USER || 'hello@gohouse.cloud';
const password = process.env.EMAIL_PASS || 'Godly@2025#';

console.log('🔍 Testing Hostinger SMTP Connection...');
console.log('📧 Email:', email);
console.log('🔑 Password:', password ? '***' : 'NOT SET');
console.log('');

// Test configuration 1: Port 587 with TLS
async function testPort587() {
  console.log('🧪 Testing Port 587 (TLS)...');
  const config = {
    host: 'smtp.hostinger.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: email,
      pass: password
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  try {
    const transporter = nodemailer.createTransport(config);
    await transporter.verify();
    console.log('✅ Port 587 (TLS) - SUCCESS!');
    return true;
  } catch (error) {
    console.log('❌ Port 587 (TLS) - FAILED:', error.message);
    return false;
  }
}

// Test configuration 2: Port 465 with SSL
async function testPort465() {
  console.log('🧪 Testing Port 465 (SSL)...');
  const config = {
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: email,
      pass: password
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  try {
    const transporter = nodemailer.createTransport(config);
    await transporter.verify();
    console.log('✅ Port 465 (SSL) - SUCCESS!');
    return true;
  } catch (error) {
    console.log('❌ Port 465 (SSL) - FAILED:', error.message);
    return false;
  }
}

// Run tests
(async () => {
  const result587 = await testPort587();
  console.log('');
  const result465 = await testPort465();
  console.log('');
  
  if (!result587 && !result465) {
    console.log('⚠️  Both ports failed. Please check:');
    console.log('   1. Username and password are correct');
    console.log('   2. SMTP is enabled in your Hostinger account');
    console.log('   3. The email account exists and is active');
    console.log('   4. No firewall is blocking the connection');
  }
})();

