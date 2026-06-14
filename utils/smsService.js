const africasTalkingProvider = require('./smsProviders/africasTalkingProvider');
const twilioProvider = require('./smsProviders/twilioProvider');

const providers = {
  africas_talking: africasTalkingProvider,
  africastalking: africasTalkingProvider,
  twilio: twilioProvider,
};

const requestedProvider = String(process.env.SMS_PROVIDER || '')
  .trim()
  .toLowerCase();

const getProviderName = () => {
  if (requestedProvider && providers[requestedProvider]) return requestedProvider;
  if (africasTalkingProvider.isConfigured()) return 'africas_talking';
  if (twilioProvider.isConfigured()) return 'twilio';
  return requestedProvider || 'none';
};

const providerName = getProviderName();
const provider = providers[providerName] || null;

if (provider?.isConfigured()) {
  console.log(`SMS service (${providerName}) configured`);
} else if (process.env.NODE_ENV === 'production') {
  console.error(`SMS service (${providerName}) is not configured`);
} else {
  console.warn(
    'SMS service not configured. Using fallback mode outside production.'
  );
}

async function sendVerificationSms(phone, code) {
  const message = `Your Neara verification code is ${code}. It expires in 10 minutes.`;

  if (!provider || !provider.isConfigured()) {
    return {
      ok: false,
      configured: false,
      provider: providerName,
      message: 'SMS provider not configured',
    };
  }

  return provider.sendSms({
    to: phone,
    message,
  });
}

module.exports = {
  sendVerificationSms,
};
