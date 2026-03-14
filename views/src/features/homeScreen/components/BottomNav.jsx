import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react';

export function BottomNav({ navigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex items-center justify-around py-3 px-4">
        <button className="flex flex-col items-center gap-1 text-blue-600">
          <Home className="w-6 h-6" />
          <span className="text-xs">Home</span>
        </button>

        <button
          onClick={() => navigate('search')}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Search className="w-6 h-6" />
          <span className="text-xs">Search</span>
        </button>

        <button
          onClick={() => navigate('create-listing')}
          className="flex items-center justify-center w-14 h-14 bg-blue-600 rounded-full -mt-8 shadow-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="w-7 h-7 text-white" />
        </button>

        <button
          onClick={() => navigate('chat-list')}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <MessageSquare className="w-6 h-6" />
          <span className="text-xs">Chats</span>
        </button>

        <button
          onClick={() => navigate('user-profile', { selectedUserId: 'me' })}
          className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <User className="w-6 h-6" />
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </nav>
  );
}
