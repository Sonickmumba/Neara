import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  MessageSquare,
} from 'lucide-react';

import { FavoriteButton } from './../../../components/FavoriteButton';
import { ReputationBadge } from './../../../components/ReputableBadge';
import { fetchHomeFeed } from '../homeFeedThunks';
import { selectAllListings, selectFeedStatus } from '../homeFeedSelectors';

export function HomeSearchResult() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const listings = useSelector(selectAllListings);
  const status = useSelector(selectFeedStatus);

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchHomeFeed());
    }
  }, [status, dispatch]);

  const categories = useMemo(() => {
    const set = new Set();
    (listings || []).forEach((listing) => {
      if (listing?.category) {
        set.add(String(listing.category).toLowerCase());
      }
    });
    return ['all', ...Array.from(set)];
  }, [listings]);

  const filteredResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return (listings || []).filter((result) => {
      const matchesQuery =
        q === '' ||
        (result.title || '').toLowerCase().includes(q) ||
        (result.description || '').toLowerCase().includes(q) ||
        (result.category || '').toLowerCase().includes(q) ||
        (result.neighborhood || '').toLowerCase().includes(q) ||
        (result.author_name || '').toLowerCase().includes(q);

      const matchesType =
        selectedType === 'all' || result.type === selectedType;
      const matchesCategory =
        selectedCategory === 'all' ||
        String(result.category || '').toLowerCase() === selectedCategory;

      return matchesQuery && matchesType && matchesCategory;
    });
  }, [listings, searchQuery, selectedType, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/homeFeed')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2>Search</h2>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search listings..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-2 text-gray-700 font-medium">
                  Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedType('all')}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      selectedType === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedType('offer')}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      selectedType === 'offer'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Offers
                  </button>
                  <button
                    onClick={() => setSelectedType('need')}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      selectedType === 'need'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Needs
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700 font-medium">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === 'all'
                        ? 'All Categories'
                        : `${category.charAt(0).toUpperCase()}${category.slice(1)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Results */}
      <div className="px-4 py-4 space-y-3">
        {status === 'loading' && (
          <div className="py-8 text-center text-gray-600">
            Loading listings...
          </div>
        )}

        {status === 'failed' && (
          <div className="py-8 text-center">
            <p className="text-gray-600 mb-3">Could not load listings.</p>
            <button
              onClick={() => dispatch(fetchHomeFeed())}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        <div className="text-sm text-gray-600 mb-4">
          {filteredResults.length} result
          {filteredResults.length !== 1 ? 's' : ''} found
        </div>

        {filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="mb-2">No results found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          filteredResults.map((result) => (
            <div
              key={result.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow relative"
            >
              <FavoriteButton
                listingId={result.id}
                className="absolute top-3 right-3 z-10"
              />

              <button
                onClick={() =>
                  navigate(`/homeFeed/listing-details/${result.id}`)
                }
                className="w-full text-left pr-8"
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      result.type === 'offer'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {result.type === 'offer' ? '🤝 Offering' : '🙋 Looking for'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                    {result.category}
                  </span>
                </div>

                <h3 className="mb-2">{result.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {result.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                      {(result.author_name ?? 'Unknown')
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">
                        {result.author_name ?? 'Unknown'}
                      </div>
                      <ReputationBadge
                        rating={result.author_rating}
                        isVerified={result.isverified}
                        totalRatings={result.totalrating}
                        size="sm"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {result.neighborhood || 'Neighborhood unknown'} •{' '}
                        {result.distance != null
                          ? `${result.distance} km`
                          : 'Distance unknown'}{' '}
                        • {result.timeAgo || 'Recently'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">
                      {result.responses_count || 0}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
