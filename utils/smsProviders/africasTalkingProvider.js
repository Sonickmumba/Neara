const AfricasTalking = require('africastalking');

const username = process.env.AFRICASTALKING_USERNAME;
const apiKey = process.env.AFRICASTALKING_API_KEY;
const senderId = process.env.AFRICASTALKING_SENDER_ID;

let smsClient = null;

if (username && apiKey) {
  try {
    const client = AfricasTalking({
      username,
      apiKey,
    });
    smsClient = client.SMS;
  } catch (error) {
    console.error(
      "Failed to initialize Africa's Talking client:",
      error.message
    );
  }
}

const isConfigured = () => Boolean(smsClient);

async function sendSms({ to, message }) {
  if (!isConfigured()) {
    return {
      ok: false,
      configured: false,
      provider: 'africas_talking',
      message: "Africa's Talking not configured",
    };
  }

  try {
    const response = await smsClient.send({
      to: [to],
      message,
      ...(senderId ? { senderId } : {}),
    });

    const recipients = response?.SMSMessageData?.Recipients || [];
    const delivered = recipients.some(
      (recipient) =>
        recipient.status === 'Success' || Number(recipient.statusCode) === 101
    );

    if (!delivered) {
      return {
        ok: false,
        configured: true,
        provider: 'africas_talking',
        message:
          response?.SMSMessageData?.Message ||
          "Africa's Talking did not accept the SMS",
        response,
      };
    }

    return {
      ok: true,
      configured: true,
      provider: 'africas_talking',
      response,
    };
  } catch (error) {
    console.error("Africa's Talking SMS send failed:", error.message);
    return {
      ok: false,
      configured: true,
      provider: 'africas_talking',
      message: error.message,
    };
  }
}

module.exports = {
  isConfigured,
  sendSms,
};
