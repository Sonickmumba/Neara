import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Star,
  Settings,
  Award,
  Shield,
  Loader2,
} from 'lucide-react';
import apiClient from '../../services/api';
import { UserStatsCard } from '../../components/UserStatsCard';
import { ReputationBadge } from '../../components/ReputableBadge';

function resolveSelectedUserId(locationState, currentUserId) {
  if (locationState?.selectedUserId) return locationState.selectedUserId;
  if (typeof locationState === 'string') return locationState;
  return currentUserId || 'me';
}

function getInitials(name) {
  return (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
}

function formatRelativeDate(dateLike) {
  if (!dateLike) return '';
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '';
  const ms = Date.now() - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(ms / day);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

function badgeColor(name) {
  if (name?.toLowerCase().includes('trusted'))
    return 'bg-yellow-100 text-yellow-700';
  if (name?.toLowerCase().includes('top')) return 'bg-blue-100 text-blue-700';
  if (name?.toLowerCase().includes('verified'))
    return 'bg-green-100 text-green-700';
  return 'bg-purple-100 text-purple-700';
}

export function UserProfileScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useSelector((state) => state.auth.user);

  const selectedUserId = useMemo(
    () => resolveSelectedUserId(location.state, currentUser?.id),
    [location.state, currentUser?.id]
  );
  const effectiveUserId =
    selectedUserId === 'me' ? currentUser?.id : selectedUserId;
  const isOwnProfile =
    selectedUserId === 'me' ||
    (currentUser?.id && effectiveUserId && currentUser.id === effectiveUserId);

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);

  const loadProfile = useCallback(async () => {
    if (!effectiveUserId) {
      setStatus('failed');
      setError('Missing user ID');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const [profileRes, statsRes, badgesRes, listingsRes, reviewsRes] =
        await Promise.all([
          apiClient.get(`/api/users/${effectiveUserId}`),
          apiClient.get(`/api/users/${effectiveUserId}/stats`),
          apiClient.get(`/api/users/${effectiveUserId}/badges`),
          apiClient.get(`/api/users/${effectiveUserId}/listings`, {
            params: { status: 'all' },
          }),
          apiClient.get(`/api/users/${effectiveUserId}/reviews`),
        ]);

      setProfile(profileRes.data?.data || null);
      setStats(statsRes.data?.data || null);
      setBadges(Array.isArray(badgesRes.data?.data) ? badgesRes.data.data : []);
      setListings(
        Array.isArray(listingsRes.data?.data)
          ? listingsRes.data.data.slice(0, 12)
          : []
      );
      setReviews(
        Array.isArray(reviewsRes.data?.data) ? reviewsRes.data.data : []
      );
      setStatus('succeeded');
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
      setStatus('failed');
    }
  }, [effectiveUserId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProfile();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <button
          onClick={() => navigate('/homeFeed')}
          className="mb-4 inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-700 mb-3">{error}</p>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile || !stats) return null;

  console.log('Rendering UserProfileScreen for user:', profile);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/homeFeed')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2>Profile</h2>
          </div>
          {isOwnProfile && (
            <button
              onClick={() => navigate('/homeFeed/settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white border-b border-gray-200 px-6 py-8">
          <div className="flex items-start gap-4 mb-4">
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={`${profile.name ?? 'User'}'s profile`}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl">
                {getInitials(profile.name)}
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1>{profile.name}</h1>
                {!!profile.phone_verified && 
                  (!!profile.email_verified && (
                    <Shield className="w-5 h-5 text-blue-600 fill-blue-100" />
                  ))}
              </div>
              <div className="mb-2">
                <ReputationBadge
                  rating={profile.rating}
                  isVerified={
                    !!profile.phone_verified && !!profile.email_verified
                  }
                  totalRatings={profile.total_ratings}
                  size="md"
                />
              </div>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <MapPin className="w-4 h-4" />
                <span>
                  {profile.neighborhood || 'Neighborhood unavailable'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Joined {profile.memberSince}</span>
              </div>
            </div>
          </div>

          {profile.bio && (
            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {badges.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-700">
                  Achievements
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <div
                    key={badge.id || badge.name}
                    className={`px-3 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${badgeColor(
                      badge.name
                    )}`}
                  >
                    <span>{badge.icon || '🏅'}</span>
                    <span>{badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <UserStatsCard
            stats={{
              rating: stats.rating,
              totalRatings: stats.totalRatings,
              completedTrades: stats.completedTrades,
              activeListings: stats.activeListings,
            }}
            layout="grid"
          />

          {!isOwnProfile && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => navigate('/homeFeed/chat-list')}
                className="flex-1 bg-blue-600 text-white py-3 rounded-full hover:bg-blue-700 transition-colors font-medium"
              >
                Send Message
              </button>
              <button
                onClick={() => navigate('/homeFeed/chat-list')}
                className="flex-1 bg-white border-2 border-blue-600 text-blue-600 py-3 rounded-full hover:bg-blue-50 transition-colors font-medium"
              >
                Propose Trade
              </button>
            </div>
          )}
        </div>

        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h3>{isOwnProfile ? 'My Listings' : 'Listings'}</h3>
            {isOwnProfile && (
              <button
                onClick={() => navigate('/homeFeed/create-listing')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Create New
              </button>
            )}
          </div>
          <div className="space-y-3">
            {listings.map((listing) => (
              <button
                key={listing.id}
                onClick={() =>
                  navigate(`/homeFeed/listing-details/${listing.id}`)
                }
                className="w-full border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      listing.type === 'offer'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {listing.type === 'offer' ? 'Offering' : 'Looking for'}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      listing.status === 'active'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {listing.status}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                    {listing.category}
                  </span>
                </div>
                <div className="font-medium mb-2">{listing.title}</div>
                <div className="text-sm text-gray-600">
                  {(listing.responses_count || 0).toString()} responses •{' '}
                  {formatRelativeDate(listing.created_at)}
                </div>
              </button>
            ))}
            {listings.length === 0 && (
              <div className="text-sm text-gray-600">No listings yet.</div>
            )}
          </div>
        </div>

        <div className="bg-white px-6 py-6">
          <h3 className="mb-4">Reviews ({reviews.length})</h3>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-b border-gray-200 pb-4 last:border-0"
              >
                <div className="flex items-start justify-between mb-2">
                  <button
                    onClick={() =>
                      navigate('/homeFeed/user-profile', {
                        state: { selectedUserId: review.reviewer_id },
                      })
                    }
                    className="font-medium hover:text-blue-600 transition-colors"
                  >
                    {review.reviewer_name}
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Number(review.rating || 0)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 mb-2">
                  {review.content || 'No review text provided.'}
                </p>
                <div className="text-xs text-gray-500">
                  {formatRelativeDate(review.created_at)}
                </div>
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="text-sm text-gray-600">No reviews yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
