import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { requestPasswordReset, resetPasswordFlow } from './authSlice';
import { Mail, Check } from 'lucide-react';
import { toast } from 'sonner';

export function ForgotPasswordModal({ onBack }) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');

  const passwordResetStatus = useSelector(
    (state) => state.auth.passwordResetStatus
  );

  const isPending = passwordResetStatus === 'pending';
  const isSucceeded = passwordResetStatus === 'succeeded';

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter your email address');
      return;
    }

    const result = await dispatch(requestPasswordReset({ email: trimmed }));

    if (!requestPasswordReset.fulfilled.match(result)) {
      toast.error(result.payload || 'Something went wrong. Please try again.');
    }
  };

  const handleBack = () => {
    dispatch(resetPasswordFlow());
    onBack();
  };

  if (isSucceeded) {
    return (
      <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Check your inbox
            </h2>
            <p className="text-sm text-gray-600">
              If an account with that email exists, we&apos;ve sent a reset
              link. It expires in 1 hour.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBack}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Forgot your password?
          </h2>
          <p className="text-sm text-gray-600">
            Enter the email linked to your account and we&apos;ll send you a
            reset link.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="reset-email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending…
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>

      <button
        type="button"
        onClick={handleBack}
        disabled={isPending}
        className="w-full mt-3 px-4 py-2 text-gray-700 border border-gray-300 rounded-md font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Back to sign in
      </button>
    </div>
  );
}
