import { useNavigate } from 'react-router-dom';
import { FavoriteButton } from '../../../components/FavoriteButton';
import { ReputationBadge } from '../../../components/ReputableBadge';
import { MessageSquare } from 'lucide-react';

export function ListingsFeed({ listings, onFavoriteToggle }) {
  const navigate = useNavigate();

  if (!listings || listings.length === 0) {
    return <p className="text-gray-600 p-6">No listings available.</p>;
  }

  return (
    <>
      {listings.map((listing) => (
        <div
          key={listing.id}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer relative"
        >
          <div className="absolute top-3 right-3 z-10">
            <FavoriteButton
              listingId={listing.id}
              onToggle={(e) => onFavoriteToggle(listing.id, e)}
            />
          </div>

          <div
            onClick={() =>
              navigate('listing-details', { selectedListingId: listing.id })
            }
            className="pr-8"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    listing.type === 'offer'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {listing.type === 'offer' ? '🤝 Offering' : '🙋 Looking for'}
                </span>
                <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                  {listing.category}
                </span>
              </div>
            </div>

            <h3 className="mb-2">{listing.title}</h3>
            <p className="text-gray-600 mb-4 line-clamp-2">
              {listing.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                  {(listing.author_name ?? 'Unknown')
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">
                    {listing.author_name ?? 'Unknown'}
                  </div>
                  <div className="flex items-center gap-2">
                    <ReputationBadge
                      rating={listing.author_rating}
                      isVerified={listing.isverified}
                      totalRatings={listing.totalrating}
                      size="sm"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {listing.neighborhood} • {listing.distance} km •{' '}
                    {listing.timeAgo}
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
    </>
  );
}
