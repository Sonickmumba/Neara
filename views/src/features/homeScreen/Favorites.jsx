import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageSquare } from 'lucide-react';

import apiClient from '../../services/api';
import { FavoriteButton } from '../../components/FavoriteButton';
import { ReputationBadge } from '../../components/ReputableBadge';

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'recently';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;

  if (Number.isNaN(diffMs) || diffMs < 0) return 'recently';

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'just now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
};

export function Favorites() {
  const navigate = useNavigate();

  const [favorites, setFavorites] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const fetchFavorites = async () => {
    try {
      setStatus('loading');
      setError(null);

      const res = await apiClient.get('/api/favorites');
      const items = Array.isArray(res.data?.data) ? res.data.data : [];

      setFavorites(items);
      setStatus('succeeded');
    } catch (err) {
      console.error('Failed to load favorites:', err);
      setError(err.response?.data?.message || 'Failed to load favorites');
      setStatus('failed');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFavorites();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchFavorites();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const favoriteItems = useMemo(() => favorites, [favorites]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/homeFeed')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
              <h2>Saved Favorites</h2>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {status === 'loading' && (
          <div className="py-12 text-center text-gray-600">
            Loading favorites...
          </div>
        )}

        {status === 'failed' && (
          <div className="py-12 text-center">
            <p className="text-gray-600 mb-4">
              {error || 'Something went wrong'}
            </p>
            <button
              onClick={fetchFavorites}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {status === 'succeeded' && favoriteItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Heart className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No favorites yet</p>
            <p className="text-sm text-center">
              Tap the heart icon on listings you are interested in to save them
              here
            </p>
          </div>
        )}

        {status === 'succeeded' && favoriteItems.length > 0 && (
          <div className="space-y-4">
            {favoriteItems.map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
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
                      {listing.type === 'offer'
                        ? '🤝 Offering'
                        : '🙋 Looking for'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                      {listing.category}
                    </span>
                  </div>
                  <FavoriteButton
                    listingId={listing.id}
                    initialIsFavorited={true}
                    size="md"
                  />
                </div>

                <button
                  onClick={() =>
                    navigate(`/homeFeed/listing-details/${listing.id}`)
                  }
                  className="mb-2 text-left hover:text-blue-600"
                >
                  <h3>{listing.title}</h3>
                </button>

                <p className="text-gray-600 mb-4 line-clamp-2">
                  {listing.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                      {(listing.author_name ?? 'Unknown')
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {listing.author_name ?? 'Unknown'}
                      </div>
                      <div className="flex items-center gap-2">
                        <ReputationBadge
                          rating={listing.author_rating}
                          isVerified={listing.isverified}
                          totalRatings={listing.totalrating}
                          size="sm"
                        />
                        <span className="text-xs text-gray-500">
                          •{' '}
                          {listing.distance != null
                            ? `${listing.distance} km`
                            : 'Distance unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">
                      {listing.responses_count || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    Saved {formatRelativeTime(listing.favorited_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
