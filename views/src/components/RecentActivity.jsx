import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, TrendingUp } from 'lucide-react';

import apiClient from '../services/api';
import { ReputationBadge } from './ReputableBadge';

const PAGE_SIZE = 6;

export function RecentActivity({ onListingClick }) {
  const [listings, setListings] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const requestSeqRef = useRef(0);

  const fetchRecentActivity = useCallback(
    async ({ append = false, startOffset = 0 } = {}) => {
      const requestId = ++requestSeqRef.current;
      const targetOffset = append ? startOffset : 0;

      try {
        if (!append) {
          setStatus('loading');
          setError(null);
        } else {
          setIsLoadingMore(true);
        }

        const response = await apiClient.get('/api/activity/recent', {
          params: {
            hours: 24,
            limit: PAGE_SIZE,
            offset: targetOffset,
          },
        });

        if (requestId !== requestSeqRef.current) return;

        const incoming = Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        setListings((prev) => (append ? [...prev, ...incoming] : incoming));
        setOffset((prev) =>
          append ? prev + incoming.length : incoming.length
        );
        setHasMore(Boolean(response.data?.hasMore));
        setStatus('succeeded');
      } catch (err) {
        if (requestId !== requestSeqRef.current) return;
        setError(
          err.response?.data?.message || 'Failed to load recent activity'
        );
        setStatus('failed');
      } finally {
        if (requestId === requestSeqRef.current) {
          setIsLoadingMore(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchRecentActivity();
  }, [fetchRecentActivity]);

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return;
    fetchRecentActivity({ append: true, startOffset: offset });
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium">New in Your Area</h3>
        </div>
        <span className="text-xs text-gray-500">Last 24 hours</span>
      </div>

      {status === 'loading' ? (
        <div className="py-8 text-center text-gray-600 text-sm">
          Loading recent activity...
        </div>
      ) : status === 'failed' ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-600 mb-3">
            {error || 'Failed to load recent activity'}
          </p>
          <button
            type="button"
            onClick={() => fetchRecentActivity()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              onClick={() => onListingClick?.(listing.id)}
              className="bg-gray-50 rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      listing.type === 'offer'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {listing.type === 'offer' ? 'Offering' : 'Looking for'}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs bg-gray-200 text-gray-700">
                    {listing.category || 'General'}
                  </span>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {listing.timeAgo}
                </span>
              </div>

              <h4 className="font-medium text-sm mb-1">{listing.title}</h4>
              <p className="text-xs text-gray-600 mb-3 line-clamp-1">
                {listing.description || 'No description provided'}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs">
                    {String(listing.author_name || 'N')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">
                      {listing.author_name || 'Unknown user'}
                    </span>
                    <div className="flex items-center gap-1">
                      <ReputationBadge
                        rating={listing.author_rating || 0}
                        size="sm"
                        showVerified={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{listing.distance || '--'}</span>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>{listing.responses_count || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load more'
              )}
            </button>
          )}
        </div>
      )}

      {status === 'succeeded' && listings.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No new listings in your area yet</p>
          <p className="text-xs mt-1">Check back soon!</p>
        </div>
      )}
    </div>
  );
}
