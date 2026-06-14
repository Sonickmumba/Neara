const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

let twilioClient = null;

if (accountSid && authToken && fromNumber) {
  try {
    twilioClient = twilio(accountSid, authToken);
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error.message);
  }
}

const isConfigured = () => Boolean(twilioClient && fromNumber);

async function sendSms({ to, message }) {
  if (!isConfigured()) {
    return {
      ok: false,
      configured: false,
      provider: 'twilio',
      message: 'Twilio not configured',
    };
  }

  try {
    const response = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to,
    });

    return {
      ok: true,
      configured: true,
      provider: 'twilio',
      messageId: response.sid,
    };
  } catch (error) {
    console.error('Twilio SMS send failed:', error.message);
    return {
      ok: false,
      configured: true,
      provider: 'twilio',
      message: error.message,
    };
  }
}

module.exports = {
  isConfigured,
  sendSms,
};
