import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

import apiClient from '../../services/api';
import { ReputationBadge } from '../../components/ReputableBadge';

const SOCKET_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
const PAGE_SIZE = 40;

function formatMessageTime(dateLike) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dedupeById(messages) {
  const map = new Map();
  for (const message of messages) {
    if (!message?.id) continue;
    map.set(message.id, message);
  }
  return [...map.values()];
}

function toUiMessage(message, currentUserId) {
  return {
    id: message.id,
    sender: message.sender_id === currentUserId ? 'me' : 'them',
    text: message.content,
    time: formatMessageTime(message.created_at),
    read: !!message.is_read,
    createdAt: message.created_at,
    senderId: message.sender_id,
    senderName: message.sender_name,
    conversationId: message.conversation_id,
    isOptimistic: !!message.isOptimistic,
  };
}

export function ChatConversationScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId } = useParams();
  const currentUser = useSelector((state) => state.auth.user);

  const [messageText, setMessageText] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Map()); // Track multiple typing users
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  // Set of userIds currently online in this conversation (populated by socket presence events)
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [error, setError] = useState(null);
  const [conversationMeta, setConversationMeta] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const restoreScrollRef = useRef(null);
  const socketRef = useRef(null); // Socket reference for emit operations
  const typingTimeoutsRef = useRef(new Map()); // Track timeouts for each user
  const typingDebounceRef = useRef(null); // Debounce typing emit

  const [messages, setMessages] = useState([]);

  const partnerName =
    conversationMeta?.partner?.name || location.state?.partnerName || 'User';
  const partnerId = conversationMeta?.partner?.id || null;
  // Derived: true when the partner's userId appears in the presence set.
  // Uses String() so numeric and string IDs always compare correctly.
  const isPartnerOnline = partnerId
    ? onlineUserIds.has(String(partnerId))
    : false;
  const listingTitle =
    conversationMeta?.listing?.title ||
    location.state?.listingTitle ||
    'Listing';

  const contact = {
    name: partnerName,
    avatar: (partnerName || 'U')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join('')
      .toUpperCase(),
    listing: listingTitle,
    rating: null,
    isVerified: false,
    totalRatings: null,
    isOnline: isPartnerOnline,
    hasActiveTrade: false,
  };

  const quickReplies = [
    'Yes, sounds good!',
    'When works for you?',
    'Let me check my schedule',
    'Can we reschedule?',
  ];

  const normalizedMessages = useMemo(
    () =>
      [...messages]
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map((m) => ({ ...m, time: m.time || formatMessageTime(m.createdAt) })),
    [messages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [normalizedMessages.length]);

  // Cleanup typing debounce on unmount
  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!restoreScrollRef.current || !messagesListRef.current) return;

    const { previousHeight, previousTop } = restoreScrollRef.current;
    const container = messagesListRef.current;

    requestAnimationFrame(() => {
      const delta = container.scrollHeight - previousHeight;
      container.scrollTop = previousTop + delta;
      restoreScrollRef.current = null;
    });
  }, [normalizedMessages.length]);

  const fetchMessagesPage = useCallback(
    async ({ before = null } = {}) => {
      const response = await apiClient.get(
        `/api/conversations/${conversationId}/messages`,
        {
          params: {
            limit: PAGE_SIZE,
            ...(before ? { before } : {}),
          },
        }
      );

      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const hasMore = !!response.data?.hasMore;
      const nextCursor = response.data?.nextCursor || null;

      return {
        rows,
        hasMore,
        nextCursor,
      };
    },
    [conversationId]
  );

  useEffect(() => {
    let mounted = true;

    async function loadConversation() {
      if (!conversationId) {
        setError('Missing conversation ID');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const [metaRes, firstPage] = await Promise.all([
          apiClient.get(`/api/conversations/${conversationId}`),
          fetchMessagesPage(),
        ]);

        if (!mounted) return;

        setConversationMeta(metaRes.data?.data || null);

        const rows = dedupeById(firstPage.rows);

        setHasMoreMessages(firstPage.hasMore);

        setMessages(rows.map((m) => toUiMessage(m, currentUser?.id)));
      } catch (err) {
        if (!mounted) return;
        console.error('Failed loading conversation:', err);
        setError(err.response?.data?.message || 'Failed to load conversation');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadConversation();

    return () => {
      mounted = false;
    };
  }, [conversationId, currentUser?.id, fetchMessagesPage]);

  const loadOlderMessages = async () => {
    if (
      !conversationId ||
      isLoadingOlder ||
      !hasMoreMessages ||
      !messages.length
    ) {
      return;
    }

    const oldest = messages.reduce((oldestItem, msg) => {
      if (!oldestItem) return msg;
      return new Date(msg.createdAt) < new Date(oldestItem.createdAt)
        ? msg
        : oldestItem;
    }, null);

    if (!oldest?.createdAt) return;

    const container = messagesListRef.current;
    if (container) {
      restoreScrollRef.current = {
        previousHeight: container.scrollHeight,
        previousTop: container.scrollTop,
      };
    }

    try {
      setIsLoadingOlder(true);
      const page = await fetchMessagesPage({ before: oldest.createdAt });

      const olderUi = dedupeById(page.rows).map((m) =>
        toUiMessage(m, currentUser?.id)
      );

      setMessages((prev) => {
        const merged = [...olderUi, ...prev];
        return dedupeById(merged);
      });
      setHasMoreMessages(page.hasMore);
    } catch (err) {
      console.error('Failed loading older messages:', err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleMessagesScroll = () => {
    const container = messagesListRef.current;
    if (!container || isLoadingOlder || !hasMoreMessages) return;

    if (container.scrollTop <= 60) {
      loadOlderMessages();
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      tryAllTransports: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Send userId so the server can track our presence
      socket.emit('join-conversation', { conversationId, userId: currentUser?.id });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setTypingUsers(new Map());
      setOnlineUserIds(new Set()); // clear presence on disconnect
    });

    socket.on('new_message', (incomingMessage) => {
      if (
        !incomingMessage ||
        incomingMessage.conversation_id !== conversationId
      ) {
        return;
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === incomingMessage.id)) {
          return prev;
        }

        const optimisticIndex = prev.findIndex(
          (m) =>
            String(m.id).startsWith('temp-') &&
            m.senderId === incomingMessage.sender_id &&
            m.text === incomingMessage.content
        );

        const normalizedIncoming = toUiMessage(
          incomingMessage,
          currentUser?.id
        );

        if (optimisticIndex >= 0) {
          const next = [...prev];
          next[optimisticIndex] = normalizedIncoming;
          return next;
        }

        return [...prev, normalizedIncoming];
      });
    });

    // Handle user typing
    socket.on('user_typing', (data) => {
      const { userId, userName } = data;

      // Clear existing timeout for this user
      if (typingTimeoutsRef.current.has(userId)) {
        clearTimeout(typingTimeoutsRef.current.get(userId));
      }

      // Set typing user
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(userId, userName);
        return next;
      });

      // Set timeout to remove typing indicator after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
        typingTimeoutsRef.current.delete(userId);
      }, 3000);

      typingTimeoutsRef.current.set(userId, timeout);
    });

    // Handle user stopped typing
    socket.on('user_stopped_typing', (data) => {
      const { userId } = data;

      // Clear timeout
      if (typingTimeoutsRef.current.has(userId)) {
        clearTimeout(typingTimeoutsRef.current.get(userId));
        typingTimeoutsRef.current.delete(userId);
      }

      // Remove typing user
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    // Presence: server sends which userIds are already online when we join
    socket.on('presence_snapshot', (onlineUserIdsList) => {
      setOnlineUserIds(new Set(onlineUserIdsList.map(String)));
    });

    // Presence: a user came online in this conversation
    socket.on('partner_online', ({ userId }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.add(String(userId));
        return next;
      });
    });

    // Presence: a user's last socket left this conversation
    socket.on('partner_offline', ({ userId }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(String(userId));
        return next;
      });
    });

    return () => {
      // Cleanup: clear all typing timeouts
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();

      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
      socket.off('presence_snapshot');
      socket.off('partner_online');
      socket.off('partner_offline');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId, currentUser?.id]);

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !conversationId || isSending) return;

    // Emit stopped typing when sending
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(
        'user_stopped_typing',
        conversationId,
        currentUser?.id
      );
    }

    // Clear typing debounce
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }

    const optimisticId = `temp-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      sender: 'me',
      text: trimmed,
      time: formatMessageTime(new Date().toISOString()),
      read: false,
      createdAt: new Date().toISOString(),
      senderId: currentUser?.id,
      senderName: currentUser?.name || 'You',
      conversationId,
      isOptimistic: true,
    };

    setIsSending(true);
    setMessageText('');
    setMessages((prev) => [...prev, optimistic]);

    try {
      const response = await apiClient.post(
        `/api/conversations/${conversationId}/messages`,
        { content: trimmed }
      );

      const saved = response.data?.data;
      if (!saved) return;

      const savedUi = toUiMessage(saved, currentUser?.id);
      setMessages((prev) => {
        const replaced = prev.map((m) => (m.id === optimisticId ? savedUi : m));
        const deduped = dedupeById(
          replaced.map((m) => ({ id: m.id, raw: m })).map((x) => x.raw)
        );
        return deduped;
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setMessageText(trimmed);
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading conversation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <button
          onClick={() => navigate('/homeFeed/chat-list')}
          className="mb-4 inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-gray-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => navigate('/homeFeed/chat-list')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* User Info - Clickable to view profile */}
              <button
                onClick={() =>
                  partnerId &&
                  navigate('/homeFeed/user-profile', {
                    state: { selectedUserId: partnerId },
                  })
                }
                className="flex items-center gap-3 flex-1 min-w-0 hover:bg-gray-50 rounded-lg p-2 -ml-2 transition-colors"
              >
                <div className="relative flex-shrink-0">

                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                    {contact.avatar}
                  </div>
                  
                  {contact.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{contact.name}</span>
                    <ReputationBadge
                      rating={contact.rating}
                      isVerified={contact.isVerified}
                      totalRatings={contact.totalRatings}
                      size="sm"
                    />
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {contact.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Phone className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Video className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Listing Reference with Active Trade Badge */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">Re: {contact.listing}</span>
            {contact.hasActiveTrade && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                Active Trade
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={messagesListRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {isLoadingOlder && (
          <div className="text-center text-xs text-gray-500">
            Loading older messages...
          </div>
        )}
        {/* Date Separator */}
        <div className="flex items-center justify-center">
          <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
            Today
          </span>
        </div>

        {normalizedMessages.map((message, index) => {
          const showAvatar =
            message.sender === 'them' &&
            (index === normalizedMessages.length - 1 ||
              normalizedMessages[index + 1]?.sender !== 'them');

          return (
            <div
              key={message.id}
              className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'them' && (
                <div className="w-8 mr-2 flex-shrink-0">
                  {showAvatar && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {contact.avatar}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`flex flex-col w-full ${message.sender === 'me' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.sender === 'me'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 rounded-bl-sm'
                  }`}
                >
                  <p className="break-words">{message.text}</p>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <span>{message.time}</span>
                  {message.sender === 'me' && (
                    <span className="text-blue-600">
                      {message.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="flex flex-col gap-2">
            {Array.from(typingUsers.entries()).map(([userId, userName]) => (
              <div key={userId} className="flex justify-start">
                <div className="w-8 mr-2 flex-shrink-0"></div>
                <div className="flex flex-col gap-1">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 rounded-bl-sm">
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 ml-4">
                    {userName} is typing...
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickReplies.map((reply, index) => (
            <button
              key={index}
              onClick={() => setMessageText(reply)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full whitespace-nowrap transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Trade Action Button */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-t border-blue-200 px-4 py-3">
        <button
          onClick={() =>
            navigate('/homeFeed/trade-negotiation', {
              state: {
                chatId: conversationId,
                listingId: conversationMeta?.listing?.id,
                listingTitle: conversationMeta?.listing?.title || listingTitle,
                listingDescription:
                  conversationMeta?.listing?.description || '',
                partnerId,
                partnerName,
              },
            })
          }
          className="w-full bg-white border-2 border-blue-400 text-blue-600 font-medium py-3 rounded-xl hover:bg-blue-50 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
        >
          <span className="text-xl">🤝</span>
          <span>Propose a Trade</span>
        </button>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
        <div className="flex gap-2 items-end">
          {/* Attachment Button */}
          <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 mb-1">
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>

          {/* Input Field */}
          <div className="flex-1 bg-gray-100 rounded-3xl px-4 py-2">
            <textarea
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);

                // Emit typing indicator with debouncing
                if (typingDebounceRef.current) {
                  clearTimeout(typingDebounceRef.current);
                }

                if (
                  e.target.value.trim() &&
                  socketRef.current &&
                  socketRef.current.connected
                ) {
                  // Emit typing event
                  socketRef.current.emit('user_typing', conversationId, {
                    userId: currentUser?.id,
                    userName: currentUser?.name || 'User',
                  });

                  // Debounce stop typing emission (emit stop typing after 2 seconds of inactivity)
                  typingDebounceRef.current = setTimeout(() => {
                    if (socketRef.current && socketRef.current.connected) {
                      socketRef.current.emit(
                        'user_stopped_typing',
                        conversationId,
                        currentUser?.id
                      );
                    }
                    typingDebounceRef.current = null;
                  }, 2000);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-transparent resize-none focus:outline-none max-h-32"
              style={{ minHeight: '24px' }}
            />
          </div>

          {/* Send/Emoji Button */}
          {messageText.trim() ? (
            <button
              onClick={handleSend}
              disabled={isSending}
              className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors flex-shrink-0 mb-1 disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          ) : (
            <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 mb-1">
              <Smile className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
