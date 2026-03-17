import { ArrowLeft, MapPin, Calendar, Star, Settings, Award, Shield } from 'lucide-react';
import { UserStatsCard } from './UserStatsCard';
import { ReputationBadge } from './ReputationBadge';

export function UserProfileScreen({ navigate, userId }) {
  const isOwnProfile = userId === 'me';

  // Mock profile data - in real app, this would be fetched based on userId
  const profile = {
    id: userId || 'me',
    name: isOwnProfile ? 'Alex Johnson' : 'Sarah Martinez',
    neighborhood: 'Downtown',
    joinedDate: 'March 2024',
    bio: isOwnProfile 
      ? 'Music teacher and avid gardener. Love connecting with my neighbors and sharing skills. Always happy to help out in the community! 🎸🌱'
      : 'Professional guitar instructor with 10+ years of experience. Passionate about helping beginners discover the joy of music.',
    rating: 4.9,
    totalRatings: 45,
    completedTrades: 32,
    activeListings: 5,
    savedFavorites: 12,
    isVerified: true
  };

  // Mock badges
  const badges = [
    { id: 1, name: 'Trusted Trader', icon: '🏆', color: 'bg-yellow-100 text-yellow-700' },
    { id: 2, name: 'Top Rated', icon: '⭐', color: 'bg-blue-100 text-blue-700' },
    { id: 3, name: 'Early Adopter', icon: '🌟', color: 'bg-purple-100 text-purple-700' }
  ];

  const listings = [
    {
      id: '1',
      type: 'offer',
      title: 'Free guitar lessons for beginners',
      category: 'Skills',
      status: 'active',
      responses: 5,
      timeAgo: '2 hours ago'
    },
    {
      id: '2',
      type: 'offer',
      title: 'Fresh vegetables from my garden',
      category: 'Goods',
      status: 'active',
      responses: 8,
      timeAgo: '1 day ago'
    },
    {
      id: '3',
      type: 'offer',
      title: 'Homemade sourdough starter',
      category: 'Goods',
      status: 'completed',
      responses: 12,
      timeAgo: '1 week ago'
    }
  ];

  const reviews = [
    {
      id: '1',
      author: 'Mike Roberts',
      authorId: 'user2',
      rating: 5,
      text: 'Amazing guitar teacher! Very patient and knowledgeable. My daughter is loving her lessons.',
      date: '2 weeks ago'
    },
    {
      id: '2',
      author: 'Lisa Kim',
      authorId: 'user3',
      rating: 5,
      text: 'The vegetables from their garden were incredibly fresh. Such a generous neighbor!',
      date: '1 month ago'
    },
    {
      id: '3',
      author: 'David Chen',
      authorId: 'user4',
      rating: 4,
      text: 'Great sourdough starter! Got it rising perfectly in just a few days. Thanks!',
      date: '2 months ago'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('home')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2>Profile</h2>
          </div>
          {isOwnProfile && (
            <button
              onClick={() => navigate('settings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl">
              {profile.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1>{profile.name}</h1>
                {profile.isVerified && (
                  <Shield className="w-5 h-5 text-blue-600 fill-blue-100" />
                )}
              </div>
              <div className="mb-2">
                <ReputationBadge 
                  rating={profile.rating}
                  isVerified={profile.isVerified}
                  totalRatings={profile.totalRatings}
                  size="md"
                />
              </div>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <MapPin className="w-4 h-4" />
                <span>{profile.neighborhood}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Joined {profile.joinedDate}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-700">Achievements</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`px-3 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${badge.color}`}
                  >
                    <span>{badge.icon}</span>
                    <span>{badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Stats Card */}
          <UserStatsCard 
            rating={profile.rating}
            completedTrades={profile.completedTrades}
            activeListings={profile.activeListings}
            savedFavorites={profile.savedFavorites}
            layout="grid"
          />

          {/* Action Buttons */}
          {!isOwnProfile && (
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => navigate('chat-conversation', { selectedChatId: profile.id })}
                className="flex-1 bg-blue-600 text-white py-3 rounded-full hover:bg-blue-700 transition-colors font-medium"
              >
                Send Message
              </button>
              <button
                onClick={() => navigate('trade-negotiation')}
                className="flex-1 bg-white border-2 border-blue-600 text-blue-600 py-3 rounded-full hover:bg-blue-50 transition-colors font-medium"
              >
                Propose Trade
              </button>
            </div>
          )}
        </div>

        {/* My Listings */}
        <div className="bg-white border-b border-gray-200 px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <h3>{isOwnProfile ? 'My Listings' : 'Listings'}</h3>
            {isOwnProfile && (
              <button
                onClick={() => navigate('create-listing')}
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
                onClick={() => navigate('listing-details', { selectedListingId: listing.id })}
                className="w-full border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    listing.type === 'offer'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {listing.type === 'offer' ? 'Offering' : 'Looking for'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    listing.status === 'active'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {listing.status}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                    {listing.category}
                  </span>
                </div>
                <div className="font-medium mb-2">{listing.title}</div>
                <div className="text-sm text-gray-600">
                  {listing.responses} responses • {listing.timeAgo}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white px-6 py-6">
          <h3 className="mb-4">Reviews ({reviews.length})</h3>
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <button
                    onClick={() => navigate('user-profile', { selectedUserId: review.authorId })}
                    className="font-medium hover:text-blue-600 transition-colors"
                  >
                    {review.author}
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 mb-2">{review.text}</p>
                <div className="text-xs text-gray-500">{review.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
