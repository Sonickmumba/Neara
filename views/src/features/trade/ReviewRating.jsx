import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  Star,
  Upload,
  X,
  Check,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { ReputationBadge } from '../../components/ReputableBadge';
import { toast } from 'sonner';

import apiClient from '../../services/api';

const REVIEW_TAGS = [
  { id: 'reliable', label: 'Reliable', icon: '✓' },
  { id: 'friendly', label: 'Friendly', icon: '😊' },
  { id: 'punctual', label: 'Punctual', icon: '⏰' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'great_communication', label: 'Great Communication', icon: '💬' },
  { id: 'high_quality', label: 'High Quality', icon: '⭐' },
  { id: 'flexible', label: 'Flexible', icon: '🤝' },
  { id: 'helpful', label: 'Helpful', icon: '👍' },
];

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export function ReviewRating() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tradeId } = useParams();
  const currentUser = useSelector((state) => state.auth.user);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trade, setTrade] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const loadTrade = useCallback(async () => {
    if (!tradeId) {
      setStatus('failed');
      setError('Missing trade ID');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const res = await apiClient.get(`/api/trades/${tradeId}`);
      setTrade(res.data?.trade || null);
      setStatus('succeeded');
    } catch (err) {
      console.error('Failed to load trade for review:', err);
      setError(err.response?.data?.message || 'Failed to load trade');
      setStatus('failed');
    }
  }, [tradeId]);

  useEffect(() => {
    loadTrade();
  }, [loadTrade]);

  const revieweeId = useMemo(() => {
    if (!trade || !currentUser?.id) return null;
    return trade.owner_id === currentUser.id
      ? trade.requester_id
      : trade.owner_id;
  }, [trade, currentUser?.id]);

  const partner = useMemo(() => {
    const fallbackName = location.state?.partnerName || 'Trade Partner';
    const partnerNameFromTrade =
      trade && currentUser?.id
        ? trade.owner_id === currentUser.id
          ? trade.requester_name
          : trade.owner_name
        : fallbackName;

    return {
      id: revieweeId,
      name: partnerNameFromTrade,
      avatar: (partnerNameFromTrade || 'T')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0])
        .join('')
        .toUpperCase(),
      rating:
        trade && currentUser?.id
          ? trade.owner_id === currentUser.id
            ? trade.requester_rating
            : trade.owner_rating
          : null,
      isVerified: false,
      totalRatings: null,
    };
  }, [location.state, trade, currentUser?.id, revieweeId]);

  const tradePreview = useMemo(
    () => ({
      title:
        trade?.listing_title || location.state?.listingTitle || 'Trade Listing',
      date: trade?.trade_date || location.state?.tradeDate || null,
      icon: '🎁',
    }),
    [trade, location.state]
  );

  const photosRef = useRef(photos);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const toggleTag = (tagId) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > 3) {
      toast.error('Maximum 3 photos allowed');
      return;
    }

    const imageUrls = files.map((file) => URL.createObjectURL(file));
    setPhotos([...photos, ...imageUrls]);
  };

  const removePhoto = (index) => {
    setPhotos((prevPhotos) => {
      const removedUrl = prevPhotos[index];
      if (removedUrl) {
        URL.revokeObjectURL(removedUrl);
      }
      return prevPhotos.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a star rating');
      return;
    }

    if (reviewText.trim().length > 0 && reviewText.trim().length < 10) {
      toast.error('Please write at least 10 characters in your review');
      return;
    }

    if (!tradeId || !revieweeId) {
      toast.error('Missing trade context for review');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post('/api/reviews', {
        tradeId,
        revieweeId,
        rating,
        content: reviewText.trim() || '',
        tags: selectedTags,
      });

      toast.success('Review submitted successfully!');

      navigate('/homeFeed');
    } catch (err) {
      console.error('Failed to submit review:', err);
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (
      confirm(
        'Are you sure you want to skip leaving a review? This helps build trust in our community.'
      )
    ) {
      navigate(`/homeFeed/trade-management/${tradeId}`);
    }
  };

  const applyTemplate = (templateRating) => {
    setRating(templateRating);

    if (templateRating === 5) {
      setReviewText(
        `Had a wonderful experience trading with ${partner.name}! Everything went smoothly and they were very professional. Highly recommend!`
      );
      setSelectedTags([
        'reliable',
        'friendly',
        'punctual',
        'great_communication',
      ]);
    } else if (templateRating === 4) {
      setReviewText(
        `Great experience overall with ${partner.name}. Would trade again!`
      );
      setSelectedTags(['reliable', 'friendly']);
    } else if (templateRating === 3) {
      setReviewText(
        `Trade went okay. ${partner.name} was decent to work with.`
      );
      setSelectedTags(['reliable']);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading review details...</span>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <button
          onClick={() => navigate(`/homeFeed/trade-management/${tradeId}`)}
          className="mb-4 inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-gray-700 mb-3">{error}</p>
          <button
            onClick={loadTrade}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  navigate(`/homeFeed/trade-management/${tradeId}`)
                }
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2>Leave a Review</h2>
                <p className="text-sm text-gray-500">
                  Help build community trust
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Skip
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Partner Card */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-medium">
                {partner.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">
                    {partner.name}
                  </h3>
                  <ReputationBadge
                    rating={partner.rating}
                    isVerified={partner.isVerified}
                    size="small"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  {partner.totalRatings} reviews
                </p>
              </div>
            </div>

            {/* Trade Info */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{tradePreview.icon}</div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {tradePreview.title}
                  </div>
                  <div className="text-sm text-gray-600">
                    {tradePreview.date
                      ? new Date(tradePreview.date).toLocaleDateString(
                          'en-US',
                          {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )
                      : 'Date unavailable'}
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full font-medium">
                  Completed
                </div>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              How was your experience?
            </h3>

            <div className="flex flex-col items-center py-4">
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-12 h-12 ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {rating > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {RATING_LABELS[rating]}
                  </div>
                  <div className="text-sm text-gray-600">
                    {rating} out of 5 stars
                  </div>
                </div>
              )}
            </div>

            {/* Quick Templates */}
            {rating === 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">Quick rate:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate(5)}
                    className="flex-1 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                  >
                    ⭐ Excellent
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate(4)}
                    className="flex-1 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    👍 Good
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate(3)}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    ✓ Okay
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              What stood out? (Optional)
            </h3>

            <div className="flex flex-wrap gap-2">
              {REVIEW_TAGS.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedTags.includes(tag.id)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-1">{tag.icon}</span>
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Written Review */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Share more details (Optional but encouraged)
            </h3>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell others about your experience with this trade. What went well? Would you recommend them?"
              rows={6}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-between mt-2">
              <p className="text-sm text-gray-500">
                Min. 10 characters recommended
              </p>
              <span className="text-sm text-gray-500">
                {reviewText.length}/500
              </span>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">
              Add Photos (Optional)
            </h3>

            <div className="space-y-3">
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={photo}
                        alt={`Review photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photos.length < 3 && (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-700 font-medium mb-1">
                      Add photos from the trade
                    </p>
                    <p className="text-xs text-gray-500">
                      Up to 3 images (JPG, PNG)
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Privacy */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="public"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <label htmlFor="public" className="flex-1 cursor-pointer">
                <div className="font-medium text-gray-900 mb-1">
                  Make this review public
                </div>
                <p className="text-sm text-gray-600">
                  Public reviews help build trust in the community. Your review
                  will appear on {partner.name}'s profile.
                </p>
              </label>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Reviews help our community thrive
                </p>
                <p className="text-sm text-blue-700">
                  Honest feedback helps everyone make better trades and builds
                  trust in LocalLoop.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-gray-50 pt-4 pb-6 -mx-4 px-4 space-y-3">
            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="w-full bg-blue-600 text-white py-4 rounded-full font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting Review...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Submit Review
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-500">
              You can edit your review within 24 hours
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
