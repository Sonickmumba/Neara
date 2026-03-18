import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  MessageSquare,
  Clock,
  Package,
  Sparkles,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '../../services/api';
import { ReputationBadge } from '../../components/ReputableBadge';

const SUGGESTED_LOCATIONS = [
  'Central Park',
  'Coffee House on Main St',
  'Community Center',
  'Public Library',
  'Town Square',
];

export function TradeNegotiation() {
  const navigate = useNavigate();
  const location = useLocation();

  const tradeSeed = useMemo(() => location.state || {}, [location.state]);
  const listingId = tradeSeed?.listingId || null;
  const ownerId = tradeSeed?.partnerId || null;
  const conversationId = tradeSeed?.chatId || null;

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    notes: '',
    offering: '',
    duration: '1',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const listing = useMemo(() => {
    const fallbackName = tradeSeed?.partnerName || 'Trade Partner';
    return {
      id: listingId,
      title: tradeSeed?.listingTitle || 'Trade Listing',
      owner: fallbackName,
      ownerId,
      avatar: (fallbackName || 'T')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0])
        .join('')
        .toUpperCase(),
      rating: null,
      isVerified: false,
      totalRatings: null,
      description:
        tradeSeed?.listingDescription ||
        'Set the trade details and submit your proposal.',
    };
  }, [listingId, ownerId, tradeSeed]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!listingId) newErrors.listing = 'Missing listing context';
    if (!ownerId) newErrors.owner = 'Missing trade partner context';
    if (!formData.date) newErrors.date = 'Please select a date';
    if (!formData.time) newErrors.time = 'Please select a time';
    if (!formData.location) newErrors.location = 'Please enter a location';
    if (!formData.offering)
      newErrors.offering = 'Please specify what you are offering';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(
        newErrors.listing || newErrors.owner
          ? 'Unable to submit trade from this context'
          : 'Please fill in all required fields'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/api/trades', {
        listingId,
        ownerId,
        requesterOffer: formData.offering.trim(),
        tradeDate: formData.date,
        tradeTime: formData.time,
        location: formData.location.trim(),
        notes: formData.notes.trim() || null,
      });

      const createdTrade = response.data?.trade;
      if (!createdTrade?.id) {
        throw new Error('Trade created but no trade ID returned');
      }

      toast.success('Trade proposal sent successfully!');
      navigate(`/homeFeed/trade-management/${createdTrade.id}`, {
        state: {
          fromConversationId: conversationId,
        },
      });
    } catch (err) {
      console.error('Failed to create trade:', err);
      toast.error(err.response?.data?.message || 'Failed to create trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Tomorrow (local time)
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() =>
              conversationId
                ? navigate(`/homeFeed/chat-conversation/${conversationId}`)
                : navigate('/homeFeed/chat-list')
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2>Propose a Trade</h2>
            <p className="text-sm text-gray-500">Set up the details</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Trade Partner Card */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 p-6 mb-6">
          <div className="flex items-center gap-2 text-sm text-blue-700 font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Trading with</span>
          </div>

          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-medium flex-shrink-0">
              {listing.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{listing.owner}</h3>
                <ReputationBadge
                  rating={listing.rating}
                  isVerified={listing.isVerified}
                  size="small"
                />
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {listing.totalRatings ?? 0} completed trades
              </p>
              <button
                onClick={() =>
                  listing.ownerId &&
                  navigate('/homeFeed/user-profile', {
                    state: { selectedUserId: listing.ownerId },
                  })
                }
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View Full Profile →
              </button>
            </div>
          </div>

          {/* Listing Preview */}
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                🎸
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 mb-1">
                  {listing.title}
                </div>
                <div className="text-sm text-gray-600">
                  {listing.description}
                </div>
                <div className="mt-2 inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                  They're offering
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Details Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date & Time */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              When should we meet?
            </h3>

            <div className="space-y-4">
              {/* Date */}
              <div>
                <label
                  htmlFor="date"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Select Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData({ ...formData, date: e.target.value });
                    setErrors({ ...errors, date: '' });
                  }}
                  min={getMinDate()}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.date && (
                  <p className="text-sm text-red-500 mt-1">{errors.date}</p>
                )}
              </div>

              {/* Time */}
              <div>
                <label
                  htmlFor="time"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Select Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  id="time"
                  value={formData.time}
                  onChange={(e) => {
                    setFormData({ ...formData, time: e.target.value });
                    setErrors({ ...errors, time: '' });
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.time ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.time && (
                  <p className="text-sm text-red-500 mt-1">{errors.time}</p>
                )}
              </div>

              {/* Duration */}
              <div>
                <label
                  htmlFor="duration"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  <Clock className="w-4 h-4 inline mr-1" />
                  Expected Duration
                </label>
                <select
                  id="duration"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="0.5">30 minutes</option>
                  <option value="1">1 hour</option>
                  <option value="1.5">1.5 hours</option>
                  <option value="2">2 hours</option>
                  <option value="3">3 hours</option>
                  <option value="4">4+ hours</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Where should we meet?
            </h3>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="location"
                  className="block mb-2 text-sm font-medium text-gray-700"
                >
                  Meeting Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({ ...formData, location: e.target.value });
                    setErrors({ ...errors, location: '' });
                  }}
                  placeholder="Enter a location or select below"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.location ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.location && (
                  <p className="text-sm text-red-500 mt-1">{errors.location}</p>
                )}
              </div>

              {/* Suggested Locations */}
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Or choose a suggested location:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, location: loc });
                        setErrors({ ...errors, location: '' });
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        formData.location === loc
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* What You're Offering */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              What are you offering in exchange?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Be specific about what skills, goods, or services you can provide
            </p>
            <textarea
              value={formData.offering}
              onChange={(e) => {
                setFormData({ ...formData, offering: e.target.value });
                setErrors({ ...errors, offering: '' });
              }}
              placeholder="e.g., I can help with web design for your business, or I have fresh vegetables from my garden to share..."
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                errors.offering ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.offering && (
              <p className="text-sm text-red-500 mt-1">{errors.offering}</p>
            )}
          </div>

          {/* Additional Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Additional Notes (Optional)
            </h3>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any other details, questions, or special requests..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Trade Summary Preview */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-4">
              <Check className="w-5 h-5" />
              <span>Trade Summary</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {formData.date
                    ? new Date(formData.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Not selected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">
                  {formData.time || 'Not selected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{formData.duration} hour(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span className="font-medium">
                  {formData.location || 'Not selected'}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-gray-50 pt-4 pb-6 -mx-4 px-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-4 rounded-full font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending Proposal...
                </>
              ) : (
                <>
                  <span className="text-xl">🤝</span>
                  Send Trade Proposal
                </>
              )}
            </button>
            <p className="text-center text-sm text-gray-500 mt-3">
              {listing.owner} will be notified and can accept or propose changes
            </p>
            {(errors.listing || errors.owner) && (
              <p className="text-center text-sm text-red-500 mt-2">
                Open this screen from a chat with a listing to create a trade.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
