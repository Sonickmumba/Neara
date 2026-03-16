import { Map, PlusCircle, MessageSquare } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export function QuickActions({ navigate, showActivity, setShowActivity }) {
  const isLoggedIn = useSelector((state) => !!state.auth.user);
  const routerNavigate = useNavigate();

  const handleCreateListing = () => {
    if (!isLoggedIn) {
      routerNavigate('/loginSignup');
      return;
    }
    navigate('create-listing');
  };
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="grid grid-cols-4 gap-3">
        <button
          onClick={() => navigate('map')}
          className="flex flex-col items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Map className="w-6 h-6 text-blue-600" />
          <span className="text-xs text-blue-600">Map</span>
        </button>
        <button
          onClick={handleCreateListing}
          className="flex flex-col items-center gap-2 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
        >
          <PlusCircle className="w-6 h-6 text-green-600" />
          <span className="text-xs text-green-600">Create</span>
        </button>
        <button
          onClick={() => navigate('chat-list')}
          className="flex flex-col items-center gap-2 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <MessageSquare className="w-6 h-6 text-purple-600" />
          <span className="text-xs text-purple-600">Chats</span>
        </button>
        <button
          onClick={() => setShowActivity(!showActivity)}
          className="flex flex-col items-center gap-2 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <span className="text-2xl">🔥</span>
          <span className="text-xs text-orange-600">Activity</span>
        </button>
      </div>
    </div>
  );
}
