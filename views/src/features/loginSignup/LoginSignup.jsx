import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  loginUser,
  registerUser,
  sendVerificationEmail,
  resetEmailVerification,
} from './authSlice';
import { EmailVerification } from './EmailVerification';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export function LoginSignup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const authStatus = useSelector((state) => state.auth.status);
  const authError = useSelector((state) => state.auth.error);
  const emailVerificationStatus = useSelector(
    (state) => state.auth.emailVerificationStatus
  );

  const isSubmitting = authStatus === 'loading';
  const [showVerificationUI, setShowVerificationUI] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);

  const [mode, setMode] = useState('signup'); // 'login' or 'signup'
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (authError) {
      toast.error(authError);
    }
  }, [authError]);

  useEffect(() => {
    if (emailVerificationStatus === 'verified') {
      // After email is verified, complete registration
      navigate('/homeFeed');
    }
  }, [emailVerificationStatus, navigate]);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};

    if (mode === 'signup' && !formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (mode === 'signup') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      if (mode === 'signup') {
        // Send verification email first
        dispatch(sendVerificationEmail({ email: formData.email }));
        setPendingEmail(formData.email);
        setShowVerificationUI(true);
        // Don't navigate yet - wait for email verification
      } else {
        await dispatch(
          loginUser({
            email: formData.email,
            password: formData.password,
          })
        ).unwrap();

        toast.success('Welcome back!');
        navigate('/homeFeed');
      }
    } catch (err) {
      toast.error(err);
    }

    // Submit
    // setIsSubmitting(true);

    // Simulate API call

    // setTimeout(() => {
    //   setIsSubmitting(false);
    //   toast.success(mode === 'signup' ? 'Account created!' : 'Welcome back!');
    //   onNext();
    // }, 1500);
  };

  const handleSocialLogin = (provider) => {
    toast.info(`${provider} login coming soon!`);
  };

  console.log('Form Data:', formData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <button className="p-2 hover:bg-white rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-md mx-auto">
          {/* Show email verification UI if needed */}
          {showVerificationUI && pendingEmail ? (
            <EmailVerification
              email={pendingEmail}
              onVerified={() => {
                // After verification, complete registration
                dispatch(
                  registerUser({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                  })
                );
              }}
              onBack={() => {
                setShowVerificationUI(false);
                dispatch(resetEmailVerification());
              }}
            />
          ) : (
            <>
              {/* Logo */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-4xl">🤝</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
                </h1>
                <p className="text-gray-600">
                  {mode === 'signup'
                    ? 'Join your neighborhood community'
                    : 'Sign in to continue trading'}
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="bg-gray-100 rounded-full p-1 flex mb-8">
                <button
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-3 rounded-full font-medium transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-gray-900 shadow-md'
                      : 'text-gray-600'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  onClick={() => setMode('login')}
                  className={`flex-1 py-3 rounded-full font-medium transition-all ${
                    mode === 'login'
                      ? 'bg-white text-gray-900 shadow-md'
                      : 'text-gray-600'
                  }`}
                >
                  Log In
                </button>
              </div>

              {/* Social Login */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleSocialLogin('Google')}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-full font-medium hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>

                <button
                  onClick={() => handleSocialLogin('Facebook')}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-full font-medium hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Continue with Facebook
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gradient-to-r from-blue-50 via-white to-purple-50 text-gray-500">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          setErrors({ ...errors, name: '' });
                        }}
                        placeholder="John Doe"
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.name}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        setErrors({ ...errors, email: '' });
                      }}
                      placeholder="you@example.com"
                      className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData({ ...formData, password: e.target.value });
                        setErrors({ ...errors, password: '' });
                      }}
                      placeholder="••••••••"
                      className={`w-full pl-12 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.password}
                    </p>
                  )}
                  {mode === 'signup' && (
                    <div className="mt-2 space-y-1">
                      <div
                        className={`text-xs flex items-center gap-1 ${
                          formData.password.length >= 8
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {formData.password.length >= 8 ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <div className="w-3 h-3 border-2 border-current rounded-full"></div>
                        )}
                        At least 8 characters
                      </div>
                    </div>
                  )}
                </div>

                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            confirmPassword: e.target.value,
                          });
                          setErrors({ ...errors, confirmPassword: '' });
                        }}
                        placeholder="••••••••"
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.confirmPassword
                            ? 'border-red-500'
                            : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {mode === 'signup'
                        ? 'Creating Account...'
                        : 'Signing In...'}
                    </>
                  ) : mode === 'signup' ? (
                    'Create Account'
                  ) : (
                    'Sign In'
                  )}
                </button>

                {mode === 'signup' && (
                  <p className="text-xs text-gray-500 text-center mt-4">
                    By signing up, you agree to our{' '}
                    <button className="text-blue-600 hover:text-blue-700">
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button className="text-blue-600 hover:text-blue-700">
                      Privacy Policy
                    </button>
                  </p>
                )}
              </form>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">Step 4 of 5</p>
      </div>
    </div>
  );
}
