import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Phone, Shield, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import {
  mergeUser,
  sendPhoneVerificationCode,
  verifyPhoneCode,
} from './authSlice';

function formatPhoneNumber(value) {
  const cleaned = value.replace(/\D/g, '');
  const local = cleaned.startsWith('260') ? cleaned.slice(3) : cleaned;
  const noLeadingZero = local.startsWith('0') ? local.slice(1) : local;
  const normalized = noLeadingZero.slice(0, 9);
  const match = normalized.match(/^(\d{0,3})(\d{0,3})(\d{0,3})$/);
  if (!match) return value;
  if (!match[2]) return match[1];
  if (!match[3]) return `${match[1]} ${match[2]}`;
  return `${match[1]} ${match[2]} ${match[3]}`;
}

function toE164(phoneInput) {
  const digits = String(phoneInput || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('260')) return `+${digits}`;
  if (digits.length === 10 && digits.startsWith('0'))
    return `+260${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('9')) return `+260${digits}`;
  return null;
}

export function PhoneVerificationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);

  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState([
    '',
    '',
    '',
    '',
    '',
    '',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');

  const queryParams = new URLSearchParams(location.search);
  const returnToFromQuery = queryParams.get('returnTo');
  const allowSkipFromQuery = queryParams.get('allowSkip');
  const phoneFromQuery = queryParams.get('phone');

  const returnTo = location.state?.returnTo || returnToFromQuery || '/homeFeed';
  const allowSkip =
    location.state?.allowSkip !== undefined
      ? location.state.allowSkip
      : allowSkipFromQuery !== 'false';

  const inputRefs = useRef([]);

  useEffect(() => {
    const prefilled =
      location.state?.phone || phoneFromQuery || currentUser?.phone;
    if (prefilled) {
      setPhoneNumber(formatPhoneNumber(String(prefilled)));
    }
  }, [location.state?.phone, phoneFromQuery, currentUser?.phone]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((x) => x - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  const handleSendCode = async () => {
    const normalized = toE164(phoneNumber);

    if (!normalized) {
      setError('Please enter a valid Zambian phone number');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await dispatch(
        sendPhoneVerificationCode({ phone: normalized })
      ).unwrap();
      setStep('verify');
      setCountdown(Number(result?.retryAfter || 60));
      toast.success('Verification code sent!');
      if (result?.devCode) {
        toast.info(`Dev OTP: ${result.devCode}`);
      }
    } catch (err) {
      setError(err || 'Failed to send verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6);
    const newCode = pastedData.split('');
    setVerificationCode([...newCode, '', '', '', '', ''].slice(0, 6));

    if (newCode.length > 0) {
      const nextIndex = Math.min(newCode.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    const normalized = toE164(phoneNumber);

    if (!normalized) {
      setError('Please provide a valid phone number');
      setStep('phone');
      return;
    }

    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updatedUser = await dispatch(
        verifyPhoneCode({ phone: normalized, code })
      ).unwrap();
      dispatch(mergeUser(updatedUser));
      toast.success('Phone verified successfully!');
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err || 'Invalid verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    await handleSendCode();
  };

  const handleSkip = () => {
    if (!allowSkip) return;
    if (
      window.confirm(
        'Skip phone verification? You can add it later in settings.'
      )
    ) {
      navigate(returnTo, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => (step === 'verify' ? setStep('phone') : navigate(-1))}
          className="p-2 hover:bg-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {allowSkip ? (
          <button
            onClick={handleSkip}
            className="text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            Skip
          </button>
        ) : (
          <span className="text-sm text-gray-500">Required</span>
        )}
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 relative flex justify-center">
            <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                {step === 'phone' ? (
                  <Phone className="w-12 h-12 text-blue-600" />
                ) : (
                  <Shield className="w-12 h-12 text-green-600" />
                )}
              </div>
            </div>
            {step === 'verify' && (
              <div className="absolute bottom-0 right-1/3 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {step === 'phone'
                ? 'Verify Your Phone'
                : 'Enter Verification Code'}
            </h1>
            <p className="text-gray-600">
              {step === 'phone'
                ? 'Help us keep Neara safe and trusted'
                : `We sent a code to ${phoneNumber}`}
            </p>
          </div>

          {step === 'phone' ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">
                      Why verify your phone?
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Build trust in the community</li>
                      <li>• Secure your account</li>
                      <li>• Enable trusted trade actions</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600">+260</span>
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="973 849 800"
                    maxLength={11}
                    className={`w-full pl-20 pr-4 py-4 border-2 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      error ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleSendCode}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </>
          ) : (
            <>
              <div className="mb-8">
                <div
                  className="flex gap-2 justify-center mb-4"
                  onPaste={handlePaste}
                >
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) =>
                        handleCodeChange(
                          index,
                          e.target.value.replace(/\D/g, '')
                        )
                      }
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        error
                          ? 'border-red-500'
                          : digit
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                )}
              </div>

              <div className="text-center mb-8">
                {countdown > 0 ? (
                  <p className="text-sm text-gray-600">
                    Resend code in{' '}
                    <span className="font-medium text-blue-600">
                      {countdown}s
                    </span>
                  </p>
                ) : (
                  <button
                    onClick={handleResendCode}
                    disabled={isSubmitting}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    Resend verification code
                  </button>
                )}
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={isSubmitting || verificationCode.some((d) => !d)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Verify Phone Number
                  </>
                )}
              </button>

              <button
                onClick={() => setStep('phone')}
                className="w-full mt-3 text-sm text-gray-600 hover:text-gray-700"
              >
                Change phone number
              </button>
            </>
          )}

          <p className="mt-6 text-xs text-gray-500 text-center">
            Your phone number will be kept private and used only for account
            security and important notifications.
          </p>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">Step 5 of 5</p>
      </div>
    </div>
  );
}
