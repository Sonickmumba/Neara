import { MessageSquare, TrendingUp } from 'lucide-react';
import { ReputationBadge } from './ReputableBadge';

// Mock data - replace with API call
const mockRecentListings = [
  {
    id: '1',
    type: 'offer',
    category: 'Skills',
    title: 'Photography lessons this weekend',
    description: 'Learn basic photography techniques. Bring your own camera.',
    author_name: 'Emma Wilson',
    author_rating: 4.9,
    author_neighborhood: 'Downtown',
    distance: '0.4 km',
    timeAgo: '1h ago',
    responses_count: 2
  },
  {
    id: '2',
    type: 'need',
    category: 'Services',
    title: 'Help assembling IKEA furniture',
    description: 'Need help with assembling a bookshelf and desk. Tools provided.',
    author_name: 'David Chen',
    author_rating: 4.7,
    author_neighborhood: 'West End',
    distance: '0.8 km',
    timeAgo: '3h ago',
    responses_count: 5
  }
];

export function RecentActivity({ onListingClick }) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium">New in Your Area</h3>
        </div>
        <span className="text-xs text-gray-500">Last 24 hours</span>
      </div>

      <div className="space-y-3">
        {mockRecentListings.map((listing) => (
          <div
            key={listing.id}
            onClick={() => onListingClick?.(listing.id)}
            className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  listing.type === 'offer'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {listing.type === 'offer' ? 'Offering' : 'Looking for'}
                </span>
                <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700">
                  {listing.category}
                </span>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {listing.timeAgo}
              </span>
            </div>

            <h4 className="font-medium text-sm mb-1">{listing.title}</h4>
            <p className="text-xs text-gray-600 mb-3 line-clamp-1">
              {listing.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs">
                  {listing.author_name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{listing.author_name}</span>
                  <div className="flex items-center gap-1">
                    <ReputationBadge 
                      rating={listing.author_rating} 
                      size="sm" 
                      showVerified={false}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{listing.distance}</span>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{listing.responses_count}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mockRecentListings.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No new listings in your area yet</p>
          <p className="text-xs mt-1">Check back soon!</p>
        </div>
      )}
    </div>
  );
}
