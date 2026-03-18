const twilio = require('twilio');

let twilioClient = null;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

if (accountSid && authToken && fromNumber) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS service configured');
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error.message);
  }
} else {
  console.warn(
    '⚠️  Twilio SMS service not configured. Using fallback mode (allowed outside production).'
  );
}

async function sendVerificationSms(phone, code) {
  if (!twilioClient || !fromNumber) {
    return {
      ok: false,
      configured: false,
      message: 'Twilio not configured',
    };
  }

  try {
    const message = await twilioClient.messages.create({
      body: `Your Neara verification code is ${code}. It expires in 10 minutes.`,
      from: fromNumber,
      to: phone,
    });

    return {
      ok: true,
      configured: true,
      sid: message.sid,
    };
  } catch (error) {
    console.error('Twilio SMS send failed:', error.message);
    return {
      ok: false,
      configured: true,
      message: error.message,
    };
  }
}

module.exports = {
  sendVerificationSms,
};
