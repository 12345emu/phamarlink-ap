// Email service for sending credentials and notifications
const nodemailer = require('nodemailer');

// Email configuration - Hostinger SMTP
// Using port 465 with SSL (matches PHP Mailer SMTPSecure::ENCRYPTION_SMTPS)
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.EMAIL_PORT) || 465, // SSL port (matches PHP Mailer)
  secure: true, // true for 465 (SSL/SMTPS), matches PHPMailer::ENCRYPTION_SMTPS
  auth: {
    user: process.env.EMAIL_USER || 'hello@gohouse.cloud',
    pass: process.env.EMAIL_PASS || 'Godly@2025#'
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates in development
  },
  connectionTimeout: 20000, // 20 seconds
  greetingTimeout: 20000, // 20 seconds
  socketTimeout: 20000, // 20 seconds
  pool: false, // Disable pooling for troubleshooting
  debug: true, // Enable debug to see what's happening
  logger: true // Enable logger to see email sending details
};

// Test email connection on startup
console.log('📧 Email configuration:', {
  host: emailConfig.host,
  port: emailConfig.port,
  user: emailConfig.auth.user,
  hasPassword: !!emailConfig.auth.pass,
  secure: emailConfig.secure
});

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify connection on startup (non-blocking)
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ Email service verification failed:', error.message);
    console.error('❌ Attempted connection to:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user
    });
    console.error('❌ Full error:', error);
  } else {
    console.log('✅ Email service is ready to send messages');
    console.log('✅ Connected to:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure
    });
  }
});

/**
 * Send pharmacist registration credentials
 * @param {string} email - Recipient email
 * @param {string} firstName - Pharmacist's first name
 * @param {string} password - Generated password
 * @returns {Promise<boolean>} Success status
 */
async function sendPharmacistCredentials(email, firstName, password) {
  try {
    const mailOptions = {
      from: `"PharmaLink" <${emailConfig.auth.user}>`,
      to: email,
      subject: 'Welcome to PharmaLink - Your Pharmacist Account Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to PharmaLink</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
            .password { font-family: monospace; font-size: 18px; font-weight: bold; color: #e74c3c; background: #f8f9fa; padding: 10px; border-radius: 4px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Welcome to PharmaLink!</h1>
              <p>Your pharmacist account has been created successfully</p>
            </div>
            
            <div class="content">
              <h2>Hello ${firstName}!</h2>
              
              <p>Congratulations! Your pharmacist registration has been approved and your account is now active on PharmaLink.</p>
              
              <div class="credentials">
                <h3>🔐 Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong></p>
                <div class="password">${password}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <ul>
                  <li>This is a temporary password - please change it after your first login</li>
                  <li>Keep your credentials secure and don't share them with anyone</li>
                  <li>If you didn't request this account, please contact our support team immediately</li>
                </ul>
              </div>
              
              <p>You can now:</p>
              <ul>
                <li>✅ Log in to your pharmacist dashboard</li>
                <li>✅ Manage your profile and services</li>
                <li>✅ Connect with patients and healthcare facilities</li>
                <li>✅ Access professional tools and resources</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="http://172.20.10.3:3000/login" class="button">Login to PharmaLink</a>
              </p>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br>
              The PharmaLink Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent from PharmaLink. Please do not reply to this email.</p>
              <p>© 2024 PharmaLink. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Pharmacist credentials email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending pharmacist credentials email:', error);
    return false;
  }
}

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @param {string} resetToken - Password reset token
 * @returns {Promise<boolean>} Success status
 */
async function sendDoctorCredentials(email, firstName, password) {
  try {
    const mailOptions = {
      from: `"PharmaLink" <${emailConfig.auth.user}>`,
      to: email,
      subject: 'Welcome to PharmaLink - Your Doctor Account Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to PharmaLink</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
            .credentials h3 { color: #667eea; margin-top: 0; }
            .credentials p { margin: 10px 0; }
            .credentials strong { color: #333; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Welcome to PharmaLink!</h1>
              <p>Your doctor account has been created successfully</p>
            </div>
            
            <div class="content">
              <h2>Hello Dr. ${firstName}!</h2>
              <p>Welcome to PharmaLink! Your doctor account has been successfully created. You can now access the platform and start providing healthcare services to patients.</p>
              
              <div class="credentials">
                <h3>🔐 Your Login Credentials</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Password:</strong> ${password}</p>
              </div>
              
              <p><strong>Important Security Notes:</strong></p>
              <ul>
                <li>Please change your password after your first login</li>
                <li>Keep your credentials secure and do not share them</li>
                <li>Contact support if you have any issues accessing your account</li>
              </ul>
              
              <p>You can now log in to your account and start using PharmaLink's features:</p>
              <ul>
                <li>Manage your profile and availability</li>
                <li>View and respond to appointment requests</li>
                <li>Access patient information and medical records</li>
                <li>Communicate with patients through the platform</li>
              </ul>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br>The PharmaLink Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2024 PharmaLink. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Doctor credentials email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending doctor credentials email:', error);
    return false;
  }
}

async function sendPasswordResetOTP(email, firstName, otpCode) {
  try {
    console.log('📧 sendPasswordResetOTP - Starting email send...');
    console.log('📧 sendPasswordResetOTP - Email:', email);
    console.log('📧 sendPasswordResetOTP - First Name:', firstName);
    console.log('📧 sendPasswordResetOTP - OTP Code:', otpCode);
    console.log('📧 sendPasswordResetOTP - From:', emailConfig.auth.user);
    
    const mailOptions = {
      from: `"PharmaLink" <${emailConfig.auth.user}>`,
      to: email,
      subject: 'PharmaLink - Password Reset OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP - PharmaLink</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: #fff; border: 3px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Verification</h1>
            </div>
            
            <div class="content">
              <h2>Hello ${firstName}!</h2>
              
              <p>We received a request to reset your password for your PharmaLink account.</p>
              
              <p>Use the following One-Time Password (OTP) to verify your identity:</p>
              
              <div class="otp-box">
                <div class="otp-code">${otpCode}</div>
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Important Security Information:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>This OTP is valid for <strong>10 minutes</strong> only</li>
                  <li>Do not share this OTP with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
              
              <p>Enter this code in the app to proceed with resetting your password.</p>
              
              <p>If you have any concerns, please contact our support team immediately.</p>
              
              <p>Best regards,<br>
              The PharmaLink Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent from PharmaLink. Please do not reply to this email.</p>
              <p>© 2024 PharmaLink. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('📧 sendPasswordResetOTP - Sending email via transporter...');
    console.log('📧 sendPasswordResetOTP - Transporter configured:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user,
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset OTP email sent successfully!');
    console.log('✅ Email Message ID:', info.messageId);
    console.log('✅ Email Response:', info.response);
    console.log('✅ Email Accepted:', info.accepted);
    console.log('✅ Email Rejected:', info.rejected);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset OTP email:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error command:', error.command);
    console.error('❌ Full error stack:', error.stack);
    
    // Check for specific error types
    if (error.code === 'EAUTH') {
      console.error('❌ Authentication failed - check email credentials');
    } else if (error.code === 'ECONNECTION') {
      console.error('❌ Connection failed - check SMTP settings');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('❌ Connection timeout - check network/SMTP server');
    }
    
    return false;
  }
}

// Keep old function for backward compatibility (if needed)
async function sendPasswordResetEmail(email, firstName, resetToken) {
  return sendPasswordResetOTP(email, firstName, '000000'); // Fallback
}

// Test email connection
async function testEmailConnection() {
  try {
    console.log('🧪 Testing email connection...');
    await transporter.verify();
    console.log('✅ Email connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Email connection test failed:', error);
    return false;
  }
}

/**
 * Send appointment confirmation email to patient
 * @param {string} patientEmail - Patient's email address
 * @param {string} patientName - Patient's full name
 * @param {string} doctorName - Doctor's name
 * @param {string} appointmentDate - Appointment date
 * @param {string} appointmentTime - Appointment time
 * @param {string} appointmentType - Type of appointment
 * @param {string} facilityName - Healthcare facility name
 * @param {string} facilityAddress - Healthcare facility address
 * @returns {Promise<boolean>} Success status
 */
async function sendAppointmentConfirmationEmail(patientEmail, patientName, doctorName, appointmentDate, appointmentTime, appointmentType, facilityName, facilityAddress) {
  try {
    const mailOptions = {
      from: `"PharmaLink" <${emailConfig.auth.user}>`,
      to: patientEmail,
      subject: 'Appointment Confirmed - PharmaLink',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Confirmed - PharmaLink</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .appointment-details { background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #2ecc71; margin: 20px 0; }
            .appointment-details h3 { color: #2ecc71; margin-top: 0; }
            .detail-row { display: flex; margin: 10px 0; }
            .detail-label { font-weight: bold; width: 120px; color: #555; }
            .detail-value { flex: 1; color: #333; }
            .success-badge { background: #d4edda; color: #155724; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0; font-weight: bold; }
            .reminder { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #2ecc71; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Appointment Confirmed!</h1>
              <p>Your appointment has been confirmed by your doctor</p>
            </div>
            
            <div class="content">
              <h2>Hello ${patientName}!</h2>
              
              <div class="success-badge">
                🎉 Great news! Your appointment has been confirmed by Dr. ${doctorName}
              </div>
              
              <div class="appointment-details">
                <h3>📅 Appointment Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Doctor:</span>
                  <span class="detail-value">Dr. ${doctorName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${appointmentTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Type:</span>
                  <span class="detail-value">${appointmentType}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Facility:</span>
                  <span class="detail-value">${facilityName}</span>
                </div>
                ${facilityAddress ? `
                <div class="detail-row">
                  <span class="detail-label">Address:</span>
                  <span class="detail-value">${facilityAddress}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="reminder">
                <strong>📋 Important Reminders:</strong>
                <ul>
                  <li>Please arrive 15 minutes before your scheduled appointment time</li>
                  <li>Bring a valid ID and your insurance card (if applicable)</li>
                  <li>If you need to reschedule or cancel, please contact us at least 24 hours in advance</li>
                  <li>If you have any questions, don't hesitate to reach out to us</li>
                </ul>
              </div>
              
              <p>We look forward to seeing you at your appointment!</p>
              
              <p>If you have any questions or need to make changes to your appointment, please contact us as soon as possible.</p>
              
              <p>Best regards,<br>
              The PharmaLink Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent from PharmaLink. Please do not reply to this email.</p>
              <p>© 2024 PharmaLink. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Appointment confirmation email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending appointment confirmation email:', error);
    return false;
  }
}

/**
 * Test email configuration
 * @returns {Promise<boolean>} Success status
 */
async function testEmailConnection() {
  try {
    console.log('🔍 Testing email connection with config:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user
    });
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error.message);
    console.error('❌ Current config being used:', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      user: emailConfig.auth.user
    });
    console.error('❌ Full error:', error);
    return false;
  }
}

/**
 * Send pharmacy registration credentials
 * @param {string} email - Recipient email
 * @param {string} ownerName - Pharmacy owner's name
 * @param {string} pharmacyName - Pharmacy name
 * @param {string} password - Generated password
 * @returns {Promise<boolean>} Success status
 */
async function sendPharmacyCredentials(email, ownerName, pharmacyName, password) {
  try {
    const mailOptions = {
      from: `"PharmaLink" <${emailConfig.auth.user}>`,
      to: email,
      subject: 'Welcome to PharmaLink - Your Pharmacy Account Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to PharmaLink</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #9b59b6; margin: 20px 0; }
            .password { font-family: monospace; font-size: 18px; font-weight: bold; color: #e74c3c; background: #f8f9fa; padding: 10px; border-radius: 4px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #9b59b6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Welcome to PharmaLink!</h1>
              <p>Your pharmacy account has been created successfully</p>
            </div>
            
            <div class="content">
              <h2>Hello ${ownerName}!</h2>
              
              <p>Congratulations! Your pharmacy <strong>${pharmacyName}</strong> has been registered on PharmaLink. Your account is now active and ready to use.</p>
              
              <div class="credentials">
                <h3>🔐 Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong></p>
                <div class="password">${password}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <ul>
                  <li>This is a temporary password - please change it after your first login</li>
                  <li>Keep your credentials secure and don't share them with anyone</li>
                  <li>If you didn't request this account, please contact our support team immediately</li>
                </ul>
              </div>
              
              <p>You can now:</p>
              <ul>
                <li>✅ Log in to your pharmacy dashboard</li>
                <li>✅ Manage your pharmacy profile and services</li>
                <li>✅ Connect with patients and healthcare professionals</li>
                <li>✅ Manage inventory and orders</li>
                <li>✅ Access pharmacy management tools</li>
              </ul>
              
              <p style="text-align: center;">
                <a href="http://172.20.10.3:3000/login" class="button">Login to PharmaLink</a>
              </p>
              
              <p><strong>Note:</strong> Your pharmacy registration is pending review. We will review your application and contact you within 3-5 business days. Once approved, your pharmacy will be visible to patients on the platform.</p>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br>
              The PharmaLink Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent from PharmaLink. Please do not reply to this email.</p>
              <p>© 2024 PharmaLink. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Pharmacy credentials email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending pharmacy credentials email:', error);
    return false;
  }
}

module.exports = {
  sendPharmacistCredentials,
  sendDoctorCredentials,
  sendPharmacyCredentials,
  sendPasswordResetOTP,
  sendPasswordResetEmail, // Keep for backward compatibility
  sendAppointmentConfirmationEmail,
  testEmailConnection
};
