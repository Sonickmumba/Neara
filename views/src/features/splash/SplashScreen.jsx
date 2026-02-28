import { useNavigate } from "react-router-dom";

export function SplashScreen() {
  const navigate = useNavigate();
  
  const onNext = () => {
    navigate('/welcome');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center text-white mb-12">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="mb-4 text-white">Welcome to Neara</h1>
        <p className="text-xl opacity-90">Your neighborhood community platform</p>
      </div>

      <div className="w-full max-w-md space-y-4 mb-12">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🤝</div>
            <div className="text-white">
              <div className="mb-1">Trade Skills</div>
              <p className="text-sm opacity-80">Share what you know, learn something new</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="text-3xl">📦</div>
            <div className="text-white">
              <div className="mb-1">Share Goods</div>
              <p className="text-sm opacity-80">Borrow, lend, and exchange items</p>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🏘️</div>
            <div className="text-white">
              <div className="mb-1">Build Community</div>
              <p className="text-sm opacity-80">Connect with neighbors nearby</p>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full max-w-md bg-white text-blue-600 py-4 rounded-full hover:bg-gray-100 transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}
