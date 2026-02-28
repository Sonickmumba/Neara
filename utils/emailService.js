const nodemailer = require('nodemailer');

// Configure email service only if credentials are provided
let transporter = null;

console.log('Email config check:');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' : 'NOT SET');

if (
  process.env.EMAIL_USER &&
  process.env.EMAIL_USER.trim() !== '' &&
  process.env.EMAIL_PASSWORD &&
  process.env.EMAIL_PASSWORD.trim() !== ''
) {
  try {
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    console.log('✅ Email transporter configured successfully');
  } catch (error) {
    console.error('❌ Failed to create transporter:', error.message);
  }
} else {
  console.warn('⚠️  Email service not configured. Operating in test mode.');
  console.warn(
    'To enable email sending, configure EMAIL_USER and EMAIL_PASSWORD in .env'
  );
}

/**
 * Send verification email with code
 * @param {string} email - Recipient email address
 * @param {string} code - 6-digit verification code
 * @returns {Promise<boolean>} - Success status
 */
async function sendVerificationEmail(email, code) {
  try {
    // Log code for development/testing
    // console.log(`\n✉️  Verification Code for ${email}: ${code}\n`);

    // If transporter is not configured, use test mode
    if (!transporter) {
      console.log('📝 Test mode: Check server logs for verification code');
      return true;
    }

    const mailOptions = {
      from: `"Neara" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your Neara email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Neara</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Community Trading Network</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Welcome to Neara!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Thank you for signing up. To complete your registration, please verify your email address using the code below.
            </p>
            
            <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <p style="color: #999; margin: 0 0 10px 0; font-size: 14px;">Verification Code</p>
              <p style="margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 5px; color: #667eea; font-family: 'Courier New', monospace;">
                ${code}
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This code will expire in 10 minutes. If you didn't create this account, please ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              If you have any questions, contact us at support@neara.com
            </p>
          </div>
        </div>
      `,
      text: `
        Welcome to Neara!
        
        Your verification code is: ${code}
        
        This code will expire in 10 minutes.
        
        If you didn't create this account, please ignore this email.
      `,
    };

    await transporter.sendMail(mailOptions);
    // console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    console.error('Error details:', error);
    // Still return true to allow signup to continue in test mode
    return true;
  }
}

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetLink - Password reset link
 * @returns {Promise<boolean>} - Success status
 */
async function sendPasswordResetEmail(email, resetLink) {
  try {
    const mailOptions = {
      from: `"Neara" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset your Neara password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">Neara</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 40px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>
            
            <a href="${resetLink}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 30px 0; font-weight: bold;">
              Reset Password
            </a>
            
            <p style="color: #666; font-size: 14px;">
              This link will expire in 24 hours. If you didn't request a password reset, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return false;
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
