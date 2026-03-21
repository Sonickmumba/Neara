import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  MessageSquare,
  MapPin,
  User,
  Share2,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api';
import { FavoriteButton } from '../../components/FavoriteButton';
import { ReputationBadge } from '../../components/ReputableBadge';
import { formatMonthYear } from '../../utils/date.js';

export function ListingDetails() {
  const { selectedListingId } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [similarListings, setSimilarListings] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  useEffect(() => {
    const fetchListingDetails = async () => {
      if (!selectedListingId) {
        setError('No listing ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await apiClient.get(
          `/api/listings/${selectedListingId}`
        );

        if (response.data?.success) {
          setListing(response.data.data);
        } else {
          setError('Listing not found');
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        if (err.response?.status === 404) {
          setError('Listing not found');
        } else {
          setError('Failed to load listing details');
        }
        toast.error('Failed to load listing details');
      } finally {
        setLoading(false);
      }
    };

    fetchListingDetails();
  }, [selectedListingId]);

  useEffect(() => {
    const fetchSimilarListings = async () => {
      if (!selectedListingId) {
        setSimilarListings([]);
        return;
      }

      try {
        setSimilarLoading(true);
        const response = await apiClient.get(
          `/api/listings/${selectedListingId}/similar`,
          {
            params: { limit: 3 },
          }
        );

        if (response.data?.success && Array.isArray(response.data.data)) {
          setSimilarListings(response.data.data);
        } else {
          setSimilarListings([]);
        }
      } catch (err) {
        console.error('Error fetching similar listings:', err);
        setSimilarListings([]);
      } finally {
        setSimilarLoading(false);
      }
    };

    fetchSimilarListings();
  }, [selectedListingId]);

  const handleContact = async () => {
    if (!listing?.id || !listing?.user_id) {
      toast.error('Cannot start conversation for this listing');
      return;
    }

    if (currentUser?.id && currentUser.id === listing.user_id) {
      toast.info('This is your own listing');
      return;
    }

    try {
      const response = await apiClient.post('/api/conversations', {
        listingId: listing.id,
        participantId: listing.user_id,
      });

      const conversationId = response.data?.data?.id;
      if (!conversationId) {
        toast.error('Failed to open conversation');
        return;
      }

      navigate(`/homeFeed/chat-conversation/${conversationId}`, {
        state: {
          listingTitle: listing.title,
          partnerName: listing.author_name,
        },
      });
    } catch (err) {
      console.error('Error starting conversation:', err);
      toast.error(
        err.response?.data?.message || 'Failed to start conversation'
      );
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.share({
        title: listing.title,
        text: `Check out this listing: ${listing.title}`,
        url: url,
      });
    } catch (err) {
      // Fallback to clipboard if Web Share API is not supported
      if (err.name !== 'AbortError') {
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      }
    }
  };

  const nextImage = () => {
    if (listing.image_urls && listing.image_urls.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === listing.image_urls.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (listing.image_urls && listing.image_urls.length > 1) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? listing.image_urls.length - 1 : prev - 1
      );
    }
  };

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedListingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading listing details...</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h2>
          <p className="text-gray-600 mb-6">{error || 'Listing not found'}</p>
          <button
            onClick={() => navigate('/homeFeed')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/homeFeed')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2>Listing Details</h2>
          </div>
          <button
            onClick={handleShare}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto">
        {/* Images Gallery */}
        {listing.image_urls && listing.image_urls.length > 0 && (
          <div className="mb-6 relative">
            <div className="relative h-80 md:h-96 rounded-xl overflow-hidden">
              <img
                src={listing.image_urls[currentImageIndex]}
                alt={`${listing.title} - Image ${currentImageIndex + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Navigation arrows */}
              {listing.image_urls.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Image counter */}
              {listing.image_urls.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {currentImageIndex + 1} / {listing.image_urls.length}
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {listing.image_urls.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto">
                {listing.image_urls.map((imageUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === currentImageIndex
                        ? 'border-blue-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={imageUrl}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Listing Content */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap flex-1">
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
            <FavoriteButton listingId={listing.id} size="lg" />
          </div>

          <h1 className="mb-4">{listing.title}</h1>

          <p className="text-gray-700 mb-6 leading-relaxed whitespace-pre-line">
            {listing.description}
          </p>

          <div className="flex flex-col gap-3 mb-6">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-5 h-5" />
              <span>
                {listing.neighborhood} •{' '}
                {listing.distance != null
                  ? `${listing.distance} km`
                  : 'Distance unknown'}{' '}
                away
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-5 h-5" />
              <span>Posted {listing.timeAgo}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MessageSquare className="w-5 h-5" />
              <span>{listing.responses_count} people responded</span>
            </div>
          </div>
        </div>

        {/* Author Info */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="mb-3 text-gray-600 font-medium">Posted by</div>
          <button
            onClick={() =>
              navigate('/homeFeed/user-profile', {
                state: { selectedUserId: listing.user_id },
              })
            }
            className="flex items-center gap-3 w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >

          {listing.profile_image_url ? (
            <img
              src={listing.profile_image_url}
              alt={`${listing.author_name ?? 'Unknown'}'s profile`}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : ( 
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-lg">
              {(listing.author_name ?? 'Unknown')
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .join('')}
            </div>)}
            <div className="flex-1 text-left">
              <div className="font-medium mb-2">
                {listing.author_name ?? 'Unknown'}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <ReputationBadge
                  rating={listing.author_rating}
                  isVerified={listing.isverified}
                  totalRatings={listing.totalrating}
                  size="md"
                />
              </div>
              <div className="text-sm text-gray-600">
                {listing.completedtrades || 0} trades completed • Member since{' '}
                {formatMonthYear(listing.created_at)}
              </div>
            </div>
            <User className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Similar Listings */}
        <div className="p-6">
          <h3 className="mb-4">Similar Listings</h3>
          {similarLoading && (
            <div className="text-sm text-gray-600">
              Loading similar listings...
            </div>
          )}

          {!similarLoading && similarListings.length === 0 && (
            <div className="text-sm text-gray-600">
              No similar listings found yet.
            </div>
          )}

          {!similarLoading && similarListings.length > 0 && (
            <div className="space-y-3">
              {similarListings.map((item) => (
                <div key={item.id} className="relative">
                  <FavoriteButton
                    listingId={item.id}
                    size="sm"
                    className="absolute top-3 right-3 z-10"
                  />
                  <button
                    onClick={() =>
                      navigate(`/homeFeed/listing-details/${item.id}`)
                    }
                    className="w-full bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow text-left pr-12"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                        {item.category}
                      </span>
                    </div>
                    <div className="font-medium mb-2">{item.title}</div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        {(item.author_name ?? 'Unknown')
                          .split(' ')
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <div className="text-sm text-gray-700">
                          {item.author_name ?? 'Unknown'}
                        </div>
                        <ReputationBadge
                          rating={item.author_rating}
                          isVerified={item.isverified}
                          totalRatings={item.totalrating}
                          size="sm"
                        />
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.neighborhood || 'Neighborhood unknown'} •{' '}
                      {item.distance != null
                        ? `${item.distance} km`
                        : 'Distance unknown'}{' '}
                      • {item.timeAgo || 'Recently'}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleContact}
            className="w-full bg-blue-600 text-white py-4 rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <MessageSquare className="w-5 h-5" />
            Send Message to {listing.author_name?.split(' ')[0] || 'Seller'}
          </button>
        </div>
      </div>
    </div>
  );
}
