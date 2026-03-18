import { ArrowRight, Users, Heart, Sparkles, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: Users,
    title: 'Connect Locally',
    description: 'Meet and trade with verified neighbors in your community',
    color: 'blue'
  },
  {
    icon: Heart,
    title: 'Trade Skills & Goods',
    description: 'Share what you have, get what you need - money or no money required',
    color: 'red'
  },
  {
    icon: Sparkles,
    title: 'Build Reputation',
    description: 'Earn trust through reviews and successful trades',
    color: 'yellow'
  },
  {
    icon: Shield,
    title: 'Safe & Secure',
    description: 'Verified users, ratings, and community guidelines',
    color: 'green'
  }
];

export function Welcome() {
  const navigate = useNavigate();

  const handleOnNext = () => {
    navigate('location');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo/Icon */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
            <span className="text-5xl">🤝</span>
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-3 text-center">
          Welcome to Neara
        </h1>
        <p className="text-xl text-gray-600 mb-12 text-center max-w-md">
          Your neighborhood trading community
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-12">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            const colorClasses = {
              blue: 'bg-blue-100 text-blue-600',
              red: 'bg-red-100 text-red-600',
              yellow: 'bg-yellow-100 text-yellow-600',
              green: 'bg-green-100 text-green-600'
            };

            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClasses[feature.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="flex gap-8 mb-12">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">10K+</div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="w-px bg-gray-300"></div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">50K+</div>
            <div className="text-sm text-gray-600">Trades Made</div>
          </div>
          <div className="w-px bg-gray-300"></div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">4.9★</div>
            <div className="text-sm text-gray-600">Avg Rating</div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleOnNext}
          className="w-full max-w-md bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
        >
          <span>Get Started</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="mt-4 text-sm text-gray-500 text-center">
          Already have an account?{' '}
          <button onClick={() => navigate('/loginSignup')} className="text-blue-600 hover:text-blue-700 font-medium">
            Sign In
          </button>
        </p>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 text-center text-xs text-gray-500">
        By continuing, you agree to our{' '}
        <button className="text-blue-600 hover:text-blue-700">Terms of Service</button>
        {' '}and{' '}
        <button className="text-blue-600 hover:text-blue-700">Privacy Policy</button>
      </div>
    </div>
  );
}
