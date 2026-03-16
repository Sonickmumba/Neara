import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, MoreVertical, Phone, Video, Image, Paperclip, Smile, User } from 'lucide-react';
import { ReputationBadge } from './ReputationBadge';

export function ChatConversationScreen({ navigate, chatId }) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'them',
      text: 'Hi! I saw your listing about guitar lessons. Are you still offering them?',
      time: '10:30 AM',
      read: true
    },
    {
      id: '2',
      sender: 'me',
      text: "Yes! I'd be happy to help you get started. Do you have any experience?",
      time: '10:32 AM',
      read: true
    },
    {
      id: '3',
      sender: 'them',
      text: "I'm a complete beginner. Never played before.",
      time: '10:35 AM',
      read: true
    },
    {
      id: '4',
      sender: 'me',
      text: "Perfect! That's exactly what I love to teach. When would you like to start?",
      time: '10:37 AM',
      read: true
    },
    {
      id: '5',
      sender: 'them',
      text: 'Sure! I can start this weekend if that works for you',
      time: '10:40 AM',
      read: true
    },
    {
      id: '6',
      sender: 'me',
      text: 'Sounds great! How about Saturday at 2pm?',
      time: '10:42 AM',
      read: true
    },
    {
      id: '7',
      sender: 'them',
      text: 'Perfect! Should I bring anything?',
      time: '10:45 AM',
      read: true
    }
  ]);

  const contact = {
    name: 'Sarah Martinez',
    avatar: 'SM',
    listing: 'Guitar lessons',
    rating: 4.9,
    isVerified: true,
    totalRatings: 47,
    isOnline: true,
    hasActiveTrade: true
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulate typing indicator
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 2000);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSend = () => {
    if (!messageText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: 'me',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };

    setMessages([...messages, newMessage]);
    setMessageText('');
  };

  const quickReplies = [
    'Yes, sounds good!',
    'When works for you?',
    'Let me check my schedule',
    'Can we reschedule?'
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => navigate('chat-list')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* User Info - Clickable to view profile */}
              <button
                onClick={() => navigate('user-profile', { selectedUserId: chatId })}
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
                      size="small"
                    />
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {contact.isOnline ? 'Online' : 'Re: ' + contact.listing}
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
            <span className="text-xs text-gray-500">
              Re: {contact.listing}
            </span>
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
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {/* Date Separator */}
        <div className="flex items-center justify-center">
          <span className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">
            Today
          </span>
        </div>

        {messages.map((message, index) => {
          const showAvatar = message.sender === 'them' && 
            (index === messages.length - 1 || messages[index + 1]?.sender !== 'them');

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

              <div className={`flex flex-col ${message.sender === 'me' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.sender === 'me'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 rounded-bl-sm'
                  }`}
                >
                  <p className="break-words">{message.text}</p>
                </div>
                <div className={`flex items-center gap-1 mt-1 text-xs ${
                  message.sender === 'me' ? 'text-gray-500' : 'text-gray-500'
                }`}>
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
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-8 mr-2 flex-shrink-0"></div>
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 rounded-bl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
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
          onClick={() => navigate('trade-negotiation', { chatId, listingId: contact.listing })}
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
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={(e) => {
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
              className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors flex-shrink-0 mb-1"
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
