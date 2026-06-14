import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { verifyEmail } from './authSlice';
import { Mail, AlertCircle, Check, Loader } from 'lucide-react';
import { toast } from 'sonner';

export function EmailVerification({ email, onVerified, onBack }) {
  const dispatch = useDispatch();
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(0);

  const emailVerificationStatus = useSelector(
    (state) => state.auth.emailVerificationStatus
  );
  const emailVerificationError = useSelector(
    (state) => state.auth.emailVerificationError
  );

  const isVerifying = emailVerificationStatus === 'pending';
  const isVerified = emailVerificationStatus === 'verified';

  // Countdown timer for resend
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error('Please enter verification code');
      return;
    }

    dispatch(verifyEmail({ email, code }));
  };

  useEffect(() => {
    if (isVerified) {
      toast.success('Email verified successfully!');
      const timer = setTimeout(() => onVerified?.(), 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerified]);

  useEffect(() => {
    if (emailVerificationError) {
      toast.error(emailVerificationError);
    }
  }, [emailVerificationError]);

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Verify your email
          </h2>
          <p className="text-sm text-gray-600">
            We sent a verification code to <br />
            <span className="font-medium">{email}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Verification Code
          </label>
          <input
            id="code"
            type="text"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength="6"
            disabled={isVerified}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg tracking-widest font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Check your email for the 6-digit code
          </p>
        </div>

        {emailVerificationError && (
          <div className="flex gap-2 items-start p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{emailVerificationError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isVerified || !code.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isVerified ? (
            <>
              <Check className="w-4 h-4" />
              Verified
            </>
          ) : isVerifying ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Email'
          )}
        </button>
      </form>

      <button
        onClick={onBack}
        disabled={isVerifying}
        className="w-full mt-3 px-4 py-2 text-gray-700 border border-gray-300 rounded-md font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Back
      </button>
    </div>
  );
}
