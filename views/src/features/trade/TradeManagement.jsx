import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  MessageCircle,
  Calendar,
  MapPin,
  Clock,
  Check,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '../../services/api';
import { ReputationBadge } from '../../components/ReputableBadge';

const STATUS_META = {
  pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepted', classes: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', classes: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Cancelled', classes: 'bg-gray-100 text-gray-700' },
};

function formatDate(dateLike) {
  if (!dateLike) return '—';
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateLike) {
  if (!dateLike) return '—';
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildDateTime(tradeDate, tradeTime) {
  if (!tradeDate || !tradeTime) return null;
  return `${tradeDate}T${tradeTime}`;
}

export function TradeManagementScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tradeId } = useParams();
  const currentUser = useSelector((state) => state.auth.user);

  const [trade, setTrade] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [isMutating, setIsMutating] = useState(false);

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
      console.error('Failed to load trade:', err);
      setError(err.response?.data?.message || 'Failed to load trade details');
      setStatus('failed');
    }
  }, [tradeId]);

  useEffect(() => {
    loadTrade();
  }, [loadTrade]);

  const isOwner = trade?.owner_id === currentUser?.id;
  const partnerName = useMemo(() => {
    if (!trade) return 'Partner';
    return isOwner ? trade.requester_name : trade.owner_name;
  }, [isOwner, trade]);

  const partnerRating = useMemo(() => {
    if (!trade) return null;
    return isOwner ? trade.requester_rating : trade.owner_rating;
  }, [isOwner, trade]);

  const partnerInitials = useMemo(() => {
    return (partnerName || 'P')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join('')
      .toUpperCase();
  }, [partnerName]);

  const dateTime = buildDateTime(trade?.trade_date, trade?.trade_time);
  const statusMeta = STATUS_META[trade?.status] || {
    label: trade?.status || 'Unknown',
    classes: 'bg-gray-100 text-gray-700',
  };

  const updateStatus = async (nextStatus) => {
    if (!trade?.id || isMutating) return;

    setIsMutating(true);
    try {
      const res = await apiClient.patch(`/api/trades/${trade.id}/status`, {
        status: nextStatus,
      });
      const updatedTrade = res.data?.data;
      if (updatedTrade) {
        setTrade((prev) => ({ ...prev, ...updatedTrade }));
      }
      toast.success(`Trade ${nextStatus}`);
    } catch (err) {
      console.error('Failed to update trade status:', err);
      toast.error(
        err.response?.data?.message || 'Failed to update trade status'
      );
    } finally {
      setIsMutating(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading trade...</span>
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
            onClick={loadTrade}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!trade) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  location.state?.fromConversationId
                    ? navigate(
                        `/homeFeed/chat-conversation/${location.state.fromConversationId}`
                      )
                    : navigate('/homeFeed/chat-list')
                }
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2>Trade Details</h2>
                <p className="text-sm text-gray-500">
                  ID: #{trade.id?.slice(0, 8)}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 text-xs rounded-full font-medium ${statusMeta.classes}`}
            >
              {statusMeta.label}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Trading With</h3>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                {partnerInitials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{partnerName}</span>
                  <ReputationBadge
                    rating={partnerRating}
                    isVerified={false}
                    totalRatings={null}
                    size="sm"
                  />
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/homeFeed/chat-list')}
              className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">The Trade</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                🎁
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-green-700 font-medium mb-1">
                  They&apos;re offering
                </div>
                <div className="font-medium text-gray-900">
                  {trade.listing_title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Type: {trade.listing_type}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="text-blue-600">⇅</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                💬
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-blue-700 font-medium mb-1">
                  You&apos;re offering
                </div>
                <div className="font-medium text-gray-900">
                  {trade.requester_offer}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Meeting Details</h3>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm text-gray-600">Date</div>
                <div className="font-medium text-gray-900">
                  {formatDate(dateTime)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm text-gray-600">Time</div>
                <div className="font-medium text-gray-900">
                  {formatTime(dateTime)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm text-gray-600">Location</div>
                <div className="font-medium text-gray-900">
                  {trade.location || '—'}
                </div>
              </div>
            </div>

            {trade.notes && (
              <div className="flex items-start gap-3 pt-3 border-t border-gray-200">
                <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">
                    Additional Notes
                  </div>
                  <div className="text-gray-900">{trade.notes}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 pt-4 pb-6 -mx-4 px-4 space-y-3">
          {trade.status === 'pending' && isOwner && (
            <>
              <button
                onClick={() => updateStatus('accepted')}
                disabled={isMutating}
                className="w-full bg-green-600 text-white py-4 rounded-full font-medium hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isMutating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Accept Trade
              </button>
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={isMutating}
                className="w-full bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-full font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <X className="w-5 h-5" />
                Decline
              </button>
            </>
          )}

          {trade.status === 'pending' && !isOwner && (
            <button
              onClick={() => updateStatus('cancelled')}
              disabled={isMutating}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-full font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isMutating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <X className="w-5 h-5" />
              )}
              Cancel Proposal
            </button>
          )}

          {trade.status === 'accepted' && (
            <>
              <button
                onClick={() => updateStatus('completed')}
                disabled={isMutating}
                className="w-full bg-blue-600 text-white py-4 rounded-full font-medium hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isMutating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
                Mark as Complete
              </button>
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={isMutating}
                className="w-full bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-full font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <X className="w-5 h-5" />
                Cancel Trade
              </button>
            </>
          )}

          {trade.status === 'completed' && (
            <button
              onClick={() =>
                navigate(`/homeFeed/review-rating/${trade.id}`, {
                  state: {
                    fromTradeManagement: true,
                    partnerName,
                    listingTitle: trade.listing_title,
                    tradeDate: trade.trade_date,
                  },
                })
              }
              className="w-full bg-purple-600 text-white py-4 rounded-full font-medium hover:bg-purple-700 transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <span className="text-xl">⭐</span>
              Leave a Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
