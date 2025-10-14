// Email service for sending credentials and notifications
const nodemailer = require('nodemailer');

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587, // Use 587 for TLS, 465 for SSL
  secure: false, // true for 465, false for other ports (587 uses TLS)
  auth: {
    user: process.env.EMAIL_USER || 'ericayesu99@gmail.com',
    pass: process.env.EMAIL_PASS || 'sklo nuxl aqbg bzhz' // Use app password for Gmail
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certificates in development
  }
};

// Test email connection on startup
console.log('📧 Email configuration:', {
  host: emailConfig.host,
  port: emailConfig.port,
  user: emailConfig.auth.user,
  hasPassword: !!emailConfig.auth.pass
});

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

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

async function sendPasswordResetEmail(email, firstName, resetToken) {
  try {
    const resetUrl = `http://172.20.10.3:3000/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"PharmaLink" <${emailConfig.auth.user}>`,
      to: email,
      subject: 'PharmaLink - Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - PharmaLink</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Request</h1>
            </div>
            
            <div class="content">
              <h2>Hello ${firstName}!</h2>
              
              <p>We received a request to reset your password for your PharmaLink account.</p>
              
              <p>Click the button below to reset your password:</p>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
              
              <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
              
              <p>If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.</p>
              
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
    console.log('✅ Password reset email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
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
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service configuration error:', error);
    return false;
  }
}

module.exports = {
  sendPharmacistCredentials,
  sendDoctorCredentials,
  sendPasswordResetEmail,
  sendAppointmentConfirmationEmail,
  testEmailConnection
};
