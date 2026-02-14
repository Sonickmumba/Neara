import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Shield, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function PhoneVerificationScreen({ onNext }) {
    const navigate = useNavigate();


  const [step, setStep] = useState('phone'); // 'phone' or 'verify'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  
  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return !match[2] 
        ? match[1]
        : !match[3]
        ? `(${match[1]}) ${match[2]}`
        : `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return value;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  const handleSendCode = () => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('verify');
      setCountdown(60);
      toast.success('Verification code sent!');
    }, 1500);
  };

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setError('');

    // Auto-focus next input
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
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newCode = pastedData.split('');
    setVerificationCode([...newCode, '', '', '', '', ''].slice(0, 6));
    
    if (newCode.length > 0) {
      const nextIndex = Math.min(newCode.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleVerifyCode = () => {
    const code = verificationCode.join('');
    
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      // For demo, accept any 6-digit code
      if (code.length === 6) {
        toast.success('Phone verified successfully!');
        navigate('/homeFeed');
      } else {
        setError('Invalid verification code. Please try again.');
      }
    }, 1500);
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setCountdown(60);
      toast.success('New code sent!');
    }, 1000);
  };

  const handleSkip = () => {
    if (confirm('Skip phone verification? You can add it later in settings.')) {
    //   onNext();
      navigate('/homeFeed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => step === 'verify' ? setStep('phone') : null}
          className="p-2 hover:bg-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleSkip}
          className="text-sm text-gray-600 hover:text-gray-700 font-medium"
        >
          Skip
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Icon */}
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

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {step === 'phone' ? 'Verify Your Phone' : 'Enter Verification Code'}
            </h1>
            <p className="text-gray-600">
              {step === 'phone' 
                ? 'Help us keep LocalLoop safe and trusted' 
                : `We sent a code to ${phoneNumber}`}
            </p>
          </div>

          {step === 'phone' ? (
            // Phone Number Entry
            <>
              {/* Why Verify */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Why verify your phone?</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Build trust in the community</li>
                      <li>• Secure your account</li>
                      <li>• Get important notifications</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Phone Input */}
              <div className="mb-6">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600">+1</span>
                  </div>
                  <input
                    type="tel"
                    id="phone"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    maxLength={14}
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

              {/* Send Code Button */}
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
            // Verification Code Entry
            <>
              {/* Code Input */}
              <div className="mb-8">
                <div className="flex gap-2 justify-center mb-4" onPaste={handlePaste}>
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        error ? 'border-red-500' : digit ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
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

              {/* Resend Code */}
              <div className="text-center mb-8">
                {countdown > 0 ? (
                  <p className="text-sm text-gray-600">
                    Resend code in <span className="font-medium text-blue-600">{countdown}s</span>
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

              {/* Verify Button */}
              <button
                onClick={handleVerifyCode}
                disabled={isSubmitting || verificationCode.some(d => !d)}
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

              {/* Change Number */}
              <button
                onClick={() => setStep('phone')}
                className="w-full mt-3 text-sm text-gray-600 hover:text-gray-700"
              >
                Change phone number
              </button>
            </>
          )}

          {/* Privacy Note */}
          <p className="mt-6 text-xs text-gray-500 text-center">
            Your phone number will be kept private and used only for account security and important notifications.
          </p>
        </div>
      </div>

      {/* Progress */}
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
