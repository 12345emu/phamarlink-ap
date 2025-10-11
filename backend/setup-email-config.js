#!/usr/bin/env node

/**
 * Email Configuration Setup Script
 * This script helps you set up Gmail SMTP for sending doctor registration emails
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEmailConfig() {
  console.log('🔧 PharmaLink Email Configuration Setup');
  console.log('=====================================\n');
  
  console.log('This script will help you configure Gmail SMTP for sending doctor registration emails.\n');
  
  console.log('📋 Prerequisites:');
  console.log('1. Gmail account with 2-factor authentication enabled');
  console.log('2. App password generated for Gmail');
  console.log('3. Access to your Gmail account settings\n');
  
  const email = await question('Enter your Gmail address: ');
  const appPassword = await question('Enter your Gmail app password (16 characters, no spaces): ');
  
  // Validate email format
  if (!email.includes('@gmail.com')) {
    console.log('⚠️  Warning: This script is configured for Gmail. Other providers may need different settings.');
  }
  
  // Validate app password format
  if (appPassword.length !== 16 || appPassword.includes(' ')) {
    console.log('⚠️  Warning: Gmail app passwords should be 16 characters with no spaces.');
    console.log('   Make sure you copied the app password correctly from Gmail settings.');
  }
  
  const envContent = `# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=pharmalink_db
DB_PORT=3306

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (for password reset and doctor credentials)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=${email}
EMAIL_PASS=${appPassword}

# API Configuration
API_BASE_URL=http://localhost:3000/api
CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads`;

  const envPath = path.join(__dirname, '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');
    console.log(`📁 Location: ${envPath}`);
    
    console.log('\n🔍 Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Test the email configuration');
    console.log('3. Try creating a doctor account again');
    
    console.log('\n📧 To test email configuration, run:');
    console.log('   node test-email-connection.js');
    
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
    console.log('\n📝 Manual setup:');
    console.log('Create a .env file in the backend directory with:');
    console.log(`EMAIL_USER=${email}`);
    console.log(`EMAIL_PASS=${appPassword}`);
  }
  
  rl.close();
}

// Instructions for Gmail App Password
console.log('📖 How to generate Gmail App Password:');
console.log('1. Go to https://myaccount.google.com/security');
console.log('2. Enable 2-Factor Authentication if not already enabled');
console.log('3. Go to "App passwords" section');
console.log('4. Select "Mail" and "Other (custom name)"');
console.log('5. Enter "PharmaLink" as the app name');
console.log('6. Copy the 16-character password (no spaces)');
console.log('7. Use this password in the setup below\n');

setupEmailConfig().catch(console.error);
