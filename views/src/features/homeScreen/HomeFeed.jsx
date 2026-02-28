import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Home, Search, Map, PlusCircle, MessageSquare, User, Bell, SlidersHorizontal, Heart } from 'lucide-react';
import { FavoriteButton } from '../../components/FavoriteButton';
import { ReputationBadge } from '../../components/ReputableBadge';
import { RecentActivity } from '../../components/RecentActivity';
import { NotificationsPanel } from '../../components/NotificationsPanel';


import { fetchHomeFeed } from './homeFeedThunks';
import {
  selectFilteredListings,
  selectFeedStatus,
  selectActiveTab,
} from './homeFeedSelectors';
import { setActiveTab } from './homeFeedSlice';

// const mockListings = [
//   {
//     id: '1',
//     type: 'offer',
//     category: 'Skills',
//     title: 'Free guitar lessons for beginners',
//     description: 'I\'ve been playing for 10 years and would love to help beginners get started. Available weekends.',
//     author: 'Sarah Martinez',
//     authorId: 'user1',
//     neighborhood: 'Downtown',
//     distance: '0.5 mi',
//     timeAgo: '2 hours ago',
//     responses: 5,
//     rating: 4.9,
//     isVerified: true,
//     totalRatings: 45
//   },
//   {
//     id: '2',
//     type: 'need',
//     category: 'Services',
//     title: 'Need help moving furniture this Saturday',
//     description: 'Moving a couch and some boxes up to a 2nd floor apartment. Can offer pizza and drinks!',
//     author: 'Mike Roberts',
//     authorId: 'user2',
//     neighborhood: 'West End',
//     distance: '1.2 mi',
//     timeAgo: '4 hours ago',
//     responses: 3,
//     rating: 4.6,
//     isVerified: true,
//     totalRatings: 28
//   },
//   {
//     id: '3',
//     type: 'offer',
//     category: 'Goods',
//     title: 'Fresh vegetables from my garden',
//     description: 'Have extra tomatoes, zucchini, and herbs. Free to anyone who wants them!',
//     author: 'Lisa Kim',
//     authorId: 'user3',
//     neighborhood: 'Downtown',
//     distance: '0.3 mi',
//     timeAgo: '1 day ago',
//     responses: 8,
//     rating: 5.0,
//     isVerified: true,
//     totalRatings: 62
//   },
//   {
//     id: '4',
//     type: 'offer',
//     category: 'Skills',
//     title: 'Math tutoring for high school students',
//     description: 'Former teacher offering help with algebra, geometry, and calculus. Free for local students.',
//     author: 'David Chen',
//     authorId: 'user4',
//     neighborhood: 'East Side',
//     distance: '2.1 mi',
//     timeAgo: '3 hours ago',
//     responses: 12,
//     rating: 4.8,
//     isVerified: false,
//     totalRatings: 34
//   },
//   {
//     id: '5',
//     type: 'need',
//     category: 'Services',
//     title: 'Looking for someone to walk my dog',
//     description: 'Need a reliable dog walker for my golden retriever, 3 days a week. Can pay or trade services.',
//     author: 'Emily Watson',
//     authorId: 'user5',
//     neighborhood: 'Downtown',
//     distance: '0.7 mi',
//     timeAgo: '5 hours ago',
//     responses: 7,
//     rating: 4.7,
//     isVerified: true,
//     totalRatings: 19
//   }
// ];

export function HomeFeed({ navigate }) {
    const dispatch = useDispatch();

// 🔗 Redux state
  const listings = useSelector(selectFilteredListings);
  const status = useSelector(selectFeedStatus);
  const activeTab = useSelector(selectActiveTab);


//   const [activeTab, setActiveTab] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

//   const filteredListings = mockListings.filter(listing => {
//     if (activeTab === 'all') return true;
//     if (activeTab === 'offers') return listing.type === 'offer';
//     if (activeTab === 'needs') return listing.type === 'need';
//     return true;
//   });

  const handleFavoriteToggle = (listingId, e) => {
    e.stopPropagation();
    // Favorite toggle is handled by FavoriteButton component
  };


  useEffect(() => {
  if (status === 'idle') {
    dispatch(fetchHomeFeed());
  }
}, [status, dispatch]);

console.log(listings);


  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <h2>LocalLoop</h2>
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
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
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

      {/* Quick Actions */}
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
            onClick={() => navigate('create-listing')}
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

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          {['all', 'offers', 'needs'].map((tab) => (
            <button
              key={tab}
              onClick={() => dispatch(setActiveTab(tab))}
              className={`px-4 py-2 rounded-full ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity Section */}
      {showActivity && (
        <div className="bg-white border-b border-gray-200 p-4">
          <RecentActivity 
            onListingClick={(listingId) => navigate('listing-details', { selectedListingId: listingId })}
          />
        </div>
      )}

      {/* Listings Feed */}
      <div className="px-4 py-4 space-y-4">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer relative"
          >
            {/* Favorite Button - Top Right */}
            <div className="absolute top-3 right-3 z-10">
              <FavoriteButton 
                listingId={listing.id}
                onToggle={(e) => handleFavoriteToggle(listing.id, e)}
              />
            </div>

            <div 
              onClick={() => navigate('listing-details', { selectedListingId: listing.id })}
              className="pr-8"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    listing.type === 'offer'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {listing.type === 'offer' ? '🤝 Offering' : '🙋 Looking for'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                    {listing.category}
                  </span>
                </div>
              </div>

              <h3 className="mb-2">{listing.title}</h3>
              <p className="text-gray-600 mb-4 line-clamp-2">{listing.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                    {listing.author_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">{listing.author_name}</div>
                    <div className="flex items-center gap-2">
                      <ReputationBadge 
                        rating={listing.author_rating}
                        isVerified={listing.isverified}
                        totalRatings={listing.totalrating}
                        size="sm"
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {listing.neighborhood} • {listing.distance} km • {listing.timeAgo}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm">{listing.responses_count}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Navigation */}
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

      {/* Notifications Panel */}
      <NotificationsPanel 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onNotificationClick={(notification) => {
          setShowNotifications(false);
          if (notification.type === 'message') {
            navigate('chat-conversation', { selectedChatId: notification.referenceId });
          } else if (notification.type === 'trade') {
            navigate('trade-management', { selectedTradeId: notification.referenceId });
          } else if (notification.type === 'listing') {
            navigate('listing-details', { selectedListingId: notification.referenceId });
          }
        }}
      />
    </div>
  );
}
