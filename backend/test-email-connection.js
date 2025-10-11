#!/usr/bin/env node

/**
 * Email Connection Test Script
 * Tests the Gmail SMTP configuration for sending emails
 */

require('dotenv').config();
const { testEmailConnection, sendDoctorCredentials } = require('./utils/emailService');

async function testEmailService() {
  console.log('🧪 Testing PharmaLink Email Service');
  console.log('===================================\n');
  
  // Test 1: Connection verification
  console.log('🔍 Test 1: Verifying SMTP connection...');
  const connectionTest = await testEmailConnection();
  
  if (!connectionTest) {
    console.log('\n❌ Connection test failed. Please check your email configuration.');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure you have a .env file with EMAIL_USER and EMAIL_PASS');
    console.log('2. Verify your Gmail app password is correct (16 characters, no spaces)');
    console.log('3. Ensure 2-factor authentication is enabled on your Gmail account');
    console.log('4. Check that your Gmail account allows "less secure app access" or use app passwords');
    console.log('5. Try running: node setup-email-config.js');
    return;
  }
  
  // Test 2: Send test email (optional)
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
  
  const sendTest = await question('\n📧 Send a test doctor credentials email? (y/n): ');
  
  if (sendTest.toLowerCase() === 'y' || sendTest.toLowerCase() === 'yes') {
    const testEmail = await question('Enter test email address: ');
    const testName = await question('Enter test doctor name: ');
    const testPassword = 'TestPassword123!';
    
    console.log('\n📤 Sending test email...');
    const emailSent = await sendDoctorCredentials(testEmail, testName, testPassword);
    
    if (emailSent) {
      console.log('✅ Test email sent successfully!');
      console.log('📬 Check the recipient inbox (and spam folder)');
    } else {
      console.log('❌ Failed to send test email');
    }
  }
  
  rl.close();
  
  console.log('\n🎉 Email service test completed!');
  console.log('\n📋 Summary:');
  console.log(`✅ SMTP Connection: ${connectionTest ? 'Working' : 'Failed'}`);
  console.log('📧 Email service is ready for doctor registration');
}

testEmailService().catch(console.error);
