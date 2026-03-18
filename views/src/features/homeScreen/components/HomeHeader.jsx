import { Heart, Bell, Search, SlidersHorizontal } from 'lucide-react';

export function HomeHeader({
  navigate,
  showNotifications,
  setShowNotifications,
  hasUnreadNotifications = false,
  unreadCount = 0,
  badgePulseNonce = 0,
}) {
  const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <h2>Neara</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('favorites')}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Heart className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-6 h-6" />
              {hasUnreadNotifications && (
                <>
                  {badgePulseNonce > 0 && (
                    <span
                      key={badgePulseNonce}
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-400 pointer-events-none"
                      style={{
                        animation: 'ping 650ms cubic-bezier(0, 0, 0.2, 1) 1',
                      }}
                    />
                  )}
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full text-[10px] leading-[18px] text-center font-semibold">
                    {badgeText}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate('search')}
            className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Search className="w-5 h-5" />
            <span>Search listings...</span>
          </button>
          <button className="p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            <SlidersHorizontal className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  );
}
