import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react';

const navItems = [
  {
    label: 'Home',
    icon: Home,
    path: '/homeFeed',
    isActive: (pathname) =>
      pathname === '/homeFeed' || pathname === '/homeFeed/',
  },
  {
    label: 'Search',
    icon: Search,
    path: '/homeFeed/search',
    isActive: (pathname) => pathname.startsWith('/homeFeed/search'),
  },
  {
    label: 'Chats',
    icon: MessageSquare,
    path: '/homeFeed/chat-list',
    isActive: (pathname) => pathname.startsWith('/homeFeed/chat-list'),
  },
  {
    label: 'Profile',
    icon: User,
    path: '/homeFeed/user-profile',
    state: { selectedUserId: 'me' },
    isActive: (pathname) =>
      pathname.startsWith('/homeFeed/user-profile') ||
      pathname.startsWith('/homeFeed/settings'),
  },
];

export function BottomNav({ navigate, pathname = '' }) {
  const navButtonClass = (active) =>
    [
      'flex flex-col items-center gap-1 transition-colors',
      active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600',
    ].join(' ');

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex items-center justify-around py-3 px-4">
        {navItems.slice(0, 2).map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() =>
                navigate(item.path, item.state && { state: item.state })
              }
              className={navButtonClass(active)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => navigate('/homeFeed/create-listing')}
          className="flex items-center justify-center w-14 h-14 bg-blue-600 rounded-full -mt-8 shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Create listing"
        >
          <PlusCircle className="w-7 h-7 text-white" />
        </button>

        {navItems.slice(2).map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() =>
                navigate(item.path, item.state && { state: item.state })
              }
              className={navButtonClass(active)}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
