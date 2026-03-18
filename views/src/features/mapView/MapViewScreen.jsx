import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  List,
  Loader2,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  X,
} from 'lucide-react';

import { FavoriteButton } from '../../components/FavoriteButton';
import { ReputationBadge } from '../../components/ReputableBadge';
import apiClient from '../../services/api';

const MAP_PADDING_PERCENT = 8;
const DEFAULT_ZOOM_LEVEL = 14;
const MIN_ZOOM_LEVEL = 10;
const MAX_ZOOM_LEVEL = 20;

const avatarFromName = (name) =>
  String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function MapViewScreen() {
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const [selectedListingId, setSelectedListingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showList, setShowList] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const requestSeqRef = useRef(0);

  const fetchMapListings = useCallback(async ({ lat, lng } = {}) => {
    const requestId = ++requestSeqRef.current;

    try {
      setStatus('loading');
      setError(null);

      const response = await apiClient.get('/api/listings', {
        params: {
          status: 'active',
          limit: 120,
          page: 1,
          ...(lat != null && lng != null ? { lat, lng, radius: 35 } : {}),
        },
      });

      if (requestId !== requestSeqRef.current) return;

      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      setListings(rows);
      setStatus('succeeded');
      setLastUpdatedAt(new Date());
    } catch (err) {
      if (requestId !== requestSeqRef.current) return;
      setStatus('failed');
      setError(err.response?.data?.message || 'Failed to load map listings');
    }
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setIsLocating(false);
          setError('Could not read your current location');
          return;
        }

        setUserLocation({ lat, lng });
        void fetchMapListings({ lat, lng }).finally(() => {
          setIsLocating(false);
        });
      },
      (geoError) => {
        setIsLocating(false);
        if (geoError.code === 1) {
          setError('Location permission denied. Enable it to use Locate Me.');
        } else if (geoError.code === 2) {
          setError('Location unavailable. Try again in a moment.');
        } else {
          setError('Location request timed out. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      }
    );
  }, [fetchMapListings]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      void fetchMapListings();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [fetchMapListings]);

  const filteredListings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return listings.filter((listing) => {
      if (filter !== 'all' && listing.type !== filter) return false;

      if (!query) return true;

      const title = String(listing.title || '').toLowerCase();
      const description = String(listing.description || '').toLowerCase();
      const author = String(listing.author_name || '').toLowerCase();
      const category = String(listing.category || '').toLowerCase();

      return (
        title.includes(query) ||
        description.includes(query) ||
        author.includes(query) ||
        category.includes(query)
      );
    });
  }, [listings, filter, searchQuery]);

  const selectedListing = useMemo(
    () =>
      filteredListings.find((listing) => listing.id === selectedListingId) ||
      null,
    [filteredListings, selectedListingId]
  );

  const markerPoints = useMemo(() => {
    if (!filteredListings.length) return [];

    const coords = filteredListings.map((listing, index) => {
      const lat = toNumberOrNull(listing.location_lat);
      const lng = toNumberOrNull(listing.location_lng);

      if (lat === null || lng === null) {
        const row = Math.floor(index / 4);
        const col = index % 4;
        return {
          listing,
          lat: -15.4 + row * 0.02,
          lng: 28.2 + col * 0.03,
          synthetic: true,
        };
      }

      return {
        listing,
        lat,
        lng,
        synthetic: false,
      };
    });

    const lats = coords.map((item) => item.lat);
    const lngs = coords.map((item) => item.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const hasUserLocation =
      userLocation?.lat != null && userLocation?.lng != null;

    const centerLat = hasUserLocation
      ? userLocation.lat
      : (minLat + maxLat) / 2;
    const centerLng = hasUserLocation
      ? userLocation.lng
      : (minLng + maxLng) / 2;

    const baseLatSpan = Math.max(maxLat - minLat, 0.0015);
    const baseLngSpan = Math.max(maxLng - minLng, 0.0015);

    const zoomScale = Math.pow(2, (DEFAULT_ZOOM_LEVEL - zoomLevel) * 0.33);
    const latSpan = baseLatSpan * zoomScale;
    const lngSpan = baseLngSpan * zoomScale;

    return coords.map((item) => {
      const normalizedY = (item.lat - (centerLat - latSpan / 2)) / latSpan;
      const normalizedX = (item.lng - (centerLng - lngSpan / 2)) / lngSpan;

      const safeX = Math.min(Math.max(normalizedX, 0), 1);
      const safeY = Math.min(Math.max(normalizedY, 0), 1);

      const xPercent =
        MAP_PADDING_PERCENT + safeX * (100 - MAP_PADDING_PERCENT * 2);
      const yPercent =
        100 - (MAP_PADDING_PERCENT + safeY * (100 - MAP_PADDING_PERCENT * 2));

      return {
        ...item,
        xPercent,
        yPercent,
      };
    });
  }, [filteredListings, userLocation, zoomLevel]);

  const totals = useMemo(() => {
    const offerCount = listings.filter((item) => item.type === 'offer').length;
    const needCount = listings.filter((item) => item.type === 'need').length;

    return {
      all: listings.length,
      offer: offerCount,
      need: needCount,
    };
  }, [listings]);

  const openListingDetails = (listingId) => {
    navigate(`/homeFeed/listing-details/${listingId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate('/homeFeed')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="flex-1 font-semibold text-gray-900">Map View</h2>
            <button
              onClick={() => setShowList((prev) => !prev)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search listings, people, category..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({totals.all})
            </button>
            <button
              onClick={() => setFilter('offer')}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === 'offer'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Offers ({totals.offer})
            </button>
            <button
              onClick={() => setFilter('need')}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === 'need'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Needs ({totals.need})
            </button>
          </div>
        </div>
      </header>

      <div className="relative h-[calc(100vh-250px)] bg-gradient-to-br from-blue-100 via-green-50 to-blue-50 overflow-hidden">
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.2),transparent_60%)]" />

        {status === 'loading' ? (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-white/90 rounded-lg px-4 py-3 shadow flex items-center gap-2 text-sm text-gray-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading map listings...
            </div>
          </div>
        ) : status === 'failed' ? (
          <div className="absolute inset-0 flex items-center justify-center z-10 px-4">
            <div className="bg-white rounded-lg p-4 shadow text-center max-w-sm">
              <p className="text-sm text-gray-700 mb-3">
                {error || 'Failed to load listings'}
              </p>
              <button
                type="button"
                onClick={() =>
                  fetchMapListings(
                    userLocation?.lat != null && userLocation?.lng != null
                      ? { lat: userLocation.lat, lng: userLocation.lng }
                      : {}
                  )
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          markerPoints.map((point) => {
            const isSelected = selectedListingId === point.listing.id;

            return (
              <button
                key={point.listing.id}
                type="button"
                onClick={() =>
                  setSelectedListingId((prev) =>
                    prev === point.listing.id ? null : point.listing.id
                  )
                }
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all ${
                  isSelected ? 'z-20 scale-110' : 'z-10'
                }`}
                style={{
                  left: `${point.xPercent}%`,
                  top: `${point.yPercent}%`,
                }}
              >
                <div
                  className={`h-10 min-w-10 px-2 rounded-full border-2 border-white shadow-md text-xs font-semibold text-white flex items-center justify-center ${
                    point.listing.type === 'offer'
                      ? 'bg-green-500'
                      : 'bg-orange-500'
                  } ${isSelected ? 'ring-4 ring-blue-300' : ''}`}
                >
                  {point.listing.type === 'offer' ? 'Offer' : 'Need'}
                </div>
              </button>
            );
          })
        )}

        <div className="absolute right-4 top-4 bg-white rounded-lg shadow-lg overflow-hidden z-10">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() =>
              setZoomLevel((prev) => Math.min(MAX_ZOOM_LEVEL, prev + 1))
            }
            disabled={zoomLevel >= MAX_ZOOM_LEVEL}
            className="p-3 hover:bg-gray-100 transition-colors border-b border-gray-200 disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() =>
              setZoomLevel((prev) => Math.max(MIN_ZOOM_LEVEL, prev - 1))
            }
            disabled={zoomLevel <= MIN_ZOOM_LEVEL}
            className="p-3 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="absolute right-4 bottom-6 p-3 bg-white rounded-full shadow-lg z-10 hover:bg-gray-50 transition-colors disabled:opacity-60"
          aria-label="Locate me"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          ) : (
            <Navigation className="w-5 h-5 text-blue-600" />
          )}
        </button>

        {userLocation && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
            style={{ left: '50%', top: '50%' }}
          >
            <div className="relative">
              <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow" />
              <div className="absolute inset-0 w-4 h-4 bg-blue-600 rounded-full animate-ping opacity-40" />
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 bg-white rounded-lg shadow px-4 py-2 z-10">
          <p className="text-sm font-medium text-gray-900">
            {filteredListings.length} listings shown
          </p>
          <p className="text-xs text-gray-500">
            Zoom: {zoomLevel} • Updated{' '}
            {lastUpdatedAt ? lastUpdatedAt.toLocaleTimeString() : 'just now'}
          </p>
        </div>
      </div>

      {selectedListing && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-blue-500 shadow-2xl z-30">
          <div className="p-4">
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {avatarFromName(selectedListing.author_name)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {selectedListing.title}
                  </h3>
                  <FavoriteButton listingId={selectedListing.id} size="sm" />
                </div>

                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-sm text-gray-700">
                    {selectedListing.author_name || 'Unknown user'}
                  </span>
                  <ReputationBadge
                    rating={selectedListing.author_rating}
                    totalRatings={selectedListing.totalrating}
                    isVerified={selectedListing.isverified}
                    size="sm"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      selectedListing.type === 'offer'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {selectedListing.type === 'offer'
                      ? 'Offering'
                      : 'Looking for'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                    <MapPin className="w-3 h-3" />
                    {selectedListing.distance != null
                      ? `${selectedListing.distance} km`
                      : selectedListing.neighborhood || 'Nearby'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => openListingDetails(selectedListing.id)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                View Details
              </button>
              <button
                onClick={() => setSelectedListingId(null)}
                className="px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showList && (
        <div className="absolute inset-0 bg-white z-40 overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 z-10">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">List View</h3>
              <button
                onClick={() => setShowList(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredListings.map((listing) => (
              <button
                key={listing.id}
                onClick={() => {
                  setSelectedListingId(listing.id);
                  setShowList(false);
                }}
                className="w-full px-4 py-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    {avatarFromName(listing.author_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">
                        {listing.title}
                      </h4>
                      <FavoriteButton listingId={listing.id} size="sm" />
                    </div>

                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm text-gray-600">
                        {listing.author_name || 'Unknown user'}
                      </span>
                      <ReputationBadge
                        rating={listing.author_rating}
                        totalRatings={listing.totalrating}
                        isVerified={listing.isverified}
                        size="sm"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          listing.type === 'offer'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {listing.type === 'offer' ? 'Offer' : 'Need'}
                      </span>
                      <span>
                        <MapPin className="w-3 h-3 inline" />{' '}
                        {listing.distance != null
                          ? `${listing.distance} km`
                          : listing.neighborhood || 'Nearby'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {!filteredListings.length && status === 'succeeded' && (
              <div className="px-4 py-12 text-center text-gray-500 text-sm">
                No listings match your current filters.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
