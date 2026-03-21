import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Pin, Trash2 } from 'lucide-react';

import apiClient from '../../services/api';
import { ReputationBadge } from '../../components/ReputableBadge';

const PAGE_SIZE = 20;
const SWIPE_ACTION_WIDTH = 88;
const SWIPE_OPEN_THRESHOLD = 52;
const SWIPE_START_THRESHOLD = 10;

function initialsFromName(name) {
  return (name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
}

export function MessageListScreen() {
  const navigate = useNavigate();
  const listRef = useRef(null);
  const requestSeqRef = useRef(0);
  const dragStateRef = useRef(null);
  const rafRef = useRef(null);
  const suppressClickRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | active-trades | unread
  const [conversations, setConversations] = useState([]);
  const [counts, setCounts] = useState({ all: 0, unread: 0, activeTrades: 0 });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [swipedChatId, setSwipedChatId] = useState(null);
  const [draggingChatId, setDraggingChatId] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchConversations = useCallback(
    async ({ append = false, cursor = null } = {}) => {
      const requestId = ++requestSeqRef.current;

      try {
        if (!append) {
          setStatus('loading');
          setError(null);
        } else {
          setIsLoadingMore(true);
        }

        const params = {
          limit: PAGE_SIZE,
          filter,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(cursor?.before ? { before: cursor.before } : {}),
          ...(cursor?.beforeId ? { beforeId: cursor.beforeId } : {}),
        };

        const res = await apiClient.get('/api/conversations', { params });
        if (requestId !== requestSeqRef.current) return;
        const items = Array.isArray(res.data?.data) ? res.data.data : [];

        if (res.data?.counts) {
          setCounts({
            all: Number(res.data.counts.all || 0),
            unread: Number(res.data.counts.unread || 0),
            activeTrades: Number(res.data.counts.activeTrades || 0),
          });
        }

        setConversations((prev) => {
          const merged = append ? [...prev, ...items] : items;
          const seen = new Set();
          return merged.filter((item) => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        });

        setHasMore(!!res.data?.hasMore);
        setNextCursor(res.data?.nextCursor || null);
        setStatus('succeeded');
      } catch (err) {
        if (requestId !== requestSeqRef.current) return;
        console.error('Failed to load conversations:', err);
        setError(err.response?.data?.message || 'Failed to load conversations');
        setStatus('failed');
      } finally {
        if (requestId === requestSeqRef.current) {
          setIsLoadingMore(false);
        }
      }
    },
    [debouncedSearch, filter]
  );

  useEffect(() => {
    setConversations([]);
    setHasMore(true);
    setNextCursor(null);
    fetchConversations();
  }, [fetchConversations]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || isLoadingMore || !hasMore || !nextCursor) return;

    if (swipedChatId) {
      setSwipedChatId(null);
    }

    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
    if (nearBottom) {
      fetchConversations({ append: true, cursor: nextCursor });
    }
  };

  const flushDragOffset = useCallback((nextOffset) => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      setDragOffset(nextOffset);
      rafRef.current = null;
    });
  }, []);

  const latestDragOffsetRef = useRef(0);

  const startSwipe = useCallback(
    (chatId, startX) => {
      const baseOffset = swipedChatId === chatId ? -SWIPE_ACTION_WIDTH : 0;
      dragStateRef.current = {
        chatId,
        startX,
        baseOffset,
        moved: false,
      };
      latestDragOffsetRef.current = baseOffset;
      setDraggingChatId(chatId);
      setDragOffset(baseOffset);
    },
    [swipedChatId]
  );

  const moveSwipe = useCallback(
    (currentX) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      const deltaX = currentX - drag.startX;
      if (Math.abs(deltaX) > SWIPE_START_THRESHOLD) {
        drag.moved = true;
      }

      if (!drag.moved) return;

      const nextOffset = Math.max(
        -SWIPE_ACTION_WIDTH,
        Math.min(0, drag.baseOffset + deltaX)
      );

      latestDragOffsetRef.current = nextOffset;
      flushDragOffset(nextOffset);
    },
    [flushDragOffset]
  );

  const endSwipe = useCallback(() => {
    const drag = dragStateRef.current;
    if (!drag) return;

    const offset = latestDragOffsetRef.current;
    const shouldOpen = offset <= -SWIPE_OPEN_THRESHOLD;
    setSwipedChatId(shouldOpen ? drag.chatId : null);
    setDraggingChatId(null);
    setDragOffset(0);
    latestDragOffsetRef.current = 0;

    if (drag.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    dragStateRef.current = null;
  }, []);

  const handleDeleteConversation = useCallback(
    async (chat) => {
      if (!chat?.id) return;

      const unread = Number(chat.unread_count || 0);
      const hasActiveTrade = !!chat.has_active_trade;

      setConversations((prev) => prev.filter((item) => item.id !== chat.id));
      setCounts((prev) => ({
        all: Math.max(0, Number(prev.all || 0) - 1),
        unread: Math.max(0, Number(prev.unread || 0) - unread),
        activeTrades: Math.max(
          0,
          Number(prev.activeTrades || 0) - (hasActiveTrade ? 1 : 0)
        ),
      }));
      setSwipedChatId((prev) => (prev === chat.id ? null : prev));

      try {
        await apiClient.delete(`/api/conversations/${chat.id}`);
      } catch (err) {
        console.error('Failed to delete conversation:', err);
        fetchConversations();
      }
    },
    [fetchConversations]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const filteredChats = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0;
    });
  }, [conversations]);

  const unreadCount = useMemo(() => counts.unread, [counts.unread]);
  const activeTradesCount = useMemo(
    () => counts.activeTrades,
    [counts.activeTrades]
  );

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
            <h2 className="flex-1">Messages</h2>
            <div className="text-sm text-gray-500">
              {filteredChats.length} conversation
              {filteredChats.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setFilter('active-trades')}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === 'active-trades'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active Trades ({activeTradesCount})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>
      </header>

      {/* Chat List */}
      {status === 'loading' ? (
        <div className="py-12 text-center text-gray-600">
          Loading conversations...
        </div>
      ) : status === 'failed' ? (
        <div className="py-12 text-center">
          <p className="text-gray-600 mb-4">
            {error || 'Failed to load conversations'}
          </p>
          <button
            onClick={() => fetchConversations()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : filteredChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No conversations found
          </h3>
          <p className="text-gray-500 text-center">
            {searchQuery
              ? `No results for "${searchQuery}"`
              : filter === 'active-trades'
                ? 'No active trades at the moment'
                : 'No unread messages'}
          </p>
        </div>
      ) : (
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="divide-y divide-gray-200 overflow-y-auto max-h-[calc(100vh-240px)]"
        >
          {filteredChats.map((chat) => {
            const isDragging = draggingChatId === chat.id;
            const isOpen = swipedChatId === chat.id;
            const offset = isDragging
              ? dragOffset
              : isOpen
                ? -SWIPE_ACTION_WIDTH
                : 0;

            return (
              <div
                key={chat.id}
                className="relative bg-white overflow-hidden touch-pan-y"
              >
                <div className="absolute inset-y-0 right-0 w-[88px] bg-red-600 flex items-center justify-center">
                  <button
                    onClick={() => void handleDeleteConversation(chat)}
                    className="h-full w-full flex flex-col items-center justify-center text-white"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-xs mt-1">Delete</span>
                  </button>
                </div>

                <button
                  onTouchStart={(event) => {
                    if (event.touches.length !== 1) return;
                    startSwipe(chat.id, event.touches[0].clientX);
                  }}
                  onTouchMove={(event) => {
                    if (event.touches.length !== 1) return;
                    moveSwipe(event.touches[0].clientX);
                  }}
                  onTouchEnd={endSwipe}
                  onTouchCancel={endSwipe}
                  onClick={() => {
                    if (suppressClickRef.current) return;
                    if (swipedChatId === chat.id) {
                      setSwipedChatId(null);
                      return;
                    }
                    navigate(`/homeFeed/chat-conversation/${chat.id}`);
                  }}
                  className="relative z-10 w-full hover:bg-gray-50 transition-transform duration-150 px-4 py-4 flex items-start gap-3 bg-white"
                  style={{ transform: `translateX(${offset}px)` }}
                >
                  {/* Avatar with online indicator */}
                  <div className="relative flex-shrink-0">

                    {chat.partner_profile_image_url ? (
                      <img
                        src={chat.partner_profile_image_url}
                        alt={chat.partner_name}
                        loading="lazy"
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                        {initialsFromName(chat.partner_name)}
                      </div>
                    )}

                    {Number(chat.unread_count) > 0 && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                        {chat.unread_count}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-left">
                    {/* Name and Time */}
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`font-medium truncate ${Number(chat.unread_count) > 0 ? 'text-gray-900' : 'text-gray-700'}`}
                        >
                          {chat.partner_name}
                        </span>
                        <ReputationBadge
                          rating={chat.partner_rating}
                          isVerified={chat.partner_is_verified}
                          totalRatings={chat.partner_total_ratings}
                          size="sm"
                        />
                        {chat.is_pinned && (
                          <Pin
                            className="w-3.5 h-3.5 text-blue-600 flex-shrink-0"
                            fill="currentColor"
                          />
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {chat.timeAgo}
                      </span>
                    </div>

                    {/* Last Message */}
                    <div
                      className={`text-sm mb-1 truncate ${
                        Number(chat.unread_count) > 0
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-600'
                      }`}
                    >
                      {chat.last_message || 'No messages yet'}
                    </div>

                    {/* Listing Reference and Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">
                        Re: {chat.listing_title}
                      </span>
                      {!!chat.has_active_trade && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                          Active Trade
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
          {isLoadingMore && (
            <div className="py-4 text-center text-sm text-gray-500">
              Loading more conversations...
            </div>
          )}
        </div>
      )}

      {/* Quick Action Hint */}
      {filteredChats.length > 0 && (
        <div className="px-4 py-6 text-center text-sm text-gray-500">
          {error
            ? error
            : hasMore
              ? 'Scroll to load more conversations'
              : 'You are all caught up'}
        </div>
      )}
    </div>
  );
}
