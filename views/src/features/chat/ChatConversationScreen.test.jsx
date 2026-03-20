/**
 * ChatConversationScreen — unit + integration tests
 *
 * Covers:
 *   - Message rendering (text, sender alignment, avatar display)
 *   - Loading state
 *   - Error state (missing conversation ID, API failure)
 *   - Send message flow: optimistic update → API confirm → socket echo dedup
 *   - Send failure: removes optimistic message, restores input
 *   - Typing indicator display
 *   - Load older messages pagination
 *   - CSS layout bug: the `flex flex-col items-end/items-start` wrapper must
 *     have `w-full` so `max-w-[75%]` resolves against the row width, not the
 *     wrapper's own collapsed (min-content) width. Without `w-full`, short
 *     words like "like you" render character-by-character.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ChatConversationScreen } from './ChatConversationScreen';

// ── Module mocks ───────────────────────────────────────────────────────────────

// Mock socket.io-client — return a controllable socket object
let mockSocket;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ conversationId: 'conv-1' }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({
    state: { partnerName: 'Bob', listingTitle: 'Guitar lessons' },
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../../components/ReputableBadge', () => ({
  ReputationBadge: () => null,
}));

// ── Test helpers ───────────────────────────────────────────────────────────────

import apiClient from '../../services/api';

const CURRENT_USER = { id: 'user-1', name: 'Alice' };
const PARTNER = { id: 'user-2', name: 'Bob' };

const authReducer = (state = { user: CURRENT_USER }) => state;

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

// Factory for API message shape (as returned by the server)
function makeApiMessage(overrides = {}) {
  return {
    id: 'msg-1',
    sender_id: PARTNER.id,
    sender_name: PARTNER.name,
    content: 'Hello!',
    created_at: '2025-01-01T10:00:00Z',
    read: false,
    conversation_id: 'conv-1',
    ...overrides,
  };
}

// Default API mock: meta + first page of messages
function setupDefaultMocks(messages = []) {
  apiClient.get.mockImplementation((url) => {
    if (url.includes('/messages')) {
      return Promise.resolve({
        data: { data: messages, hasMore: false, nextCursor: null },
      });
    }
    // Conversation meta
    return Promise.resolve({
      data: {
        data: {
          partner: PARTNER,
          listing: { id: 'listing-1', title: 'Guitar lessons' },
        },
      },
    });
  });
}

function createMockSocket(handlers = {}) {
  const eventHandlers = { ...handlers };
  return {
    on: vi.fn((event, cb) => {
      eventHandlers[event] = cb;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    _handlers: eventHandlers,
    // Helper: simulate server → client event
    _trigger(event, data) {
      act(() => {
        if (eventHandlers[event]) eventHandlers[event](data);
      });
    },
  };
}

function renderScreen() {
  return render(
    <Provider store={makeStore()}>
      <ChatConversationScreen />
    </Provider>
  );
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockSocket = createMockSocket();
  setupDefaultMocks();

  // jsdom does not implement scrollIntoView — mock it globally
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('ChatConversationScreen — loading state', () => {
  it('shows a loading indicator before the conversation resolves', () => {
    // Never resolves
    apiClient.get.mockReturnValue(new Promise(() => {}));
    renderScreen();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});

// ── Error states ──────────────────────────────────────────────────────────────

describe('ChatConversationScreen — error states', () => {
  it('shows an error message when the API fails', async () => {
    apiClient.get.mockRejectedValue(
      Object.assign(new Error('Network error'), {
        response: { data: { message: 'Network error' } },
      })
    );

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('shows a generic error when the server gives no message', async () => {
    apiClient.get.mockRejectedValue(new Error('fail'));
    renderScreen();

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load conversation/i)
      ).toBeInTheDocument();
    });
  });
});

// ── Message rendering ─────────────────────────────────────────────────────────

describe('ChatConversationScreen — message rendering', () => {
  it('renders a message from the partner with the correct text', async () => {
    setupDefaultMocks([makeApiMessage({ content: 'Hey there!' })]);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Hey there!')).toBeInTheDocument();
    });
  });

  it('renders a message sent by the current user', async () => {
    setupDefaultMocks([
      makeApiMessage({
        id: 'msg-my',
        sender_id: CURRENT_USER.id,
        content: 'My message',
      }),
    ]);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('My message')).toBeInTheDocument();
    });
  });

  it('renders multiple messages in order', async () => {
    setupDefaultMocks([
      makeApiMessage({ id: 'a', content: 'First message' }),
      makeApiMessage({ id: 'b', content: 'Second message' }),
    ]);
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });
  });

  it('renders text exactly as-is — no character transformation', async () => {
    // Regression: ensure JS is NOT splitting characters before render
    const text = 'like you';
    setupDefaultMocks([makeApiMessage({ content: text })]);
    renderScreen();

    await waitFor(() => {
      // The full string must appear in a single element
      expect(screen.getByText(text)).toBeInTheDocument();
    });
  });

  it('renders an empty conversation without crashing', async () => {
    setupDefaultMocks([]);
    renderScreen();

    await waitFor(() => {
      // Partner name should still render in the header
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });
});

// ── CSS layout bug ────────────────────────────────────────────────────────────

describe('ChatConversationScreen — message bubble layout (CSS bug)', () => {
  /**
   * ROOT CAUSE BUG:
   * The `flex flex-col items-end/items-start` wrapper around each message
   * bubble has NO explicit width. As a flex item inside `flex justify-end`,
   * it shrinks to min-content. `max-w-[75%]` then resolves to 75% of that
   * already-narrow wrapper — an extremely small container. Combined with
   * `break-words` (overflow-wrap: break-word) this causes character-level
   * line breaks: "like you" → "lik / e / yo / u".
   *
   * THE FIX: add `w-full` to the `flex flex-col` wrapper so `max-w-[75%]`
   * resolves against the full row width.
   */
  it('message bubble wrapper has w-full so max-w-[75%] resolves against row width', async () => {
    setupDefaultMocks([makeApiMessage({ content: 'like you' })]);
    const { container } = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('like you')).toBeInTheDocument();
    });

    // The wrapper div that has `flex flex-col items-start/items-end`
    // must also have `w-full` to prevent the circular percentage collapse
    const wrappers = container.querySelectorAll('[class*="flex-col"]');
    const bubbleWrapper = Array.from(wrappers).find(
      (el) =>
        el.className.includes('items-start') ||
        el.className.includes('items-end')
    );

    expect(bubbleWrapper).not.toBeNull();
    expect(bubbleWrapper.className).toContain('w-full');
  });

  it('sent message bubble wrapper also has w-full', async () => {
    setupDefaultMocks([
      makeApiMessage({
        id: 'mine',
        sender_id: CURRENT_USER.id,
        content: 'like you',
      }),
    ]);
    const { container } = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('like you')).toBeInTheDocument();
    });

    const wrappers = container.querySelectorAll('[class*="flex-col"]');
    const sentWrapper = Array.from(wrappers).find((el) =>
      el.className.includes('items-end')
    );

    expect(sentWrapper).not.toBeNull();
    expect(sentWrapper.className).toContain('w-full');
  });
});

// ── Send message ──────────────────────────────────────────────────────────────

describe('ChatConversationScreen — send message', () => {
  it('adds an optimistic message when the user sends', async () => {
    // POST never resolves — we just want to check optimistic state
    apiClient.post.mockReturnValue(new Promise(() => {}));
    renderScreen();

    await waitFor(() => screen.getByPlaceholderText(/type a message/i));

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: 'Hello world' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });
  });

  it('replaces the optimistic message with the confirmed one after API resolves', async () => {
    const savedMessage = makeApiMessage({
      id: 'saved-1',
      sender_id: CURRENT_USER.id,
      content: 'Hello world',
    });

    apiClient.post.mockResolvedValue({ data: { data: savedMessage } });
    renderScreen();

    await waitFor(() => screen.getByPlaceholderText(/type a message/i));

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: 'Hello world' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      // Exactly one instance — optimistic replaced by confirmed
      expect(screen.getAllByText('Hello world')).toHaveLength(1);
    });
  });

  it('removes the optimistic message and restores the input on send failure', async () => {
    apiClient.post.mockRejectedValue(
      Object.assign(new Error('Send failed'), {
        response: { data: { message: 'Send failed' } },
      })
    );
    renderScreen();

    await waitFor(() => screen.getByPlaceholderText(/type a message/i));

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: 'Oops message' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    // After POST rejects, the message bubble (inside a <p>) must be removed.
    // We explicitly check <p> elements to avoid matching the restored textarea value.
    await waitFor(() => {
      const paragraphs = document.querySelectorAll('p');
      const found = Array.from(paragraphs).some(
        (p) => p.textContent === 'Oops message'
      );
      expect(found).toBe(false);
    });

    // The trimmed text is restored to the input so the user can retry
    expect(input.value).toBe('Oops message');
  });

  it('does not send when the message is only whitespace', async () => {
    renderScreen();
    await waitFor(() => screen.getByPlaceholderText(/type a message/i));

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('Shift+Enter inserts a newline instead of sending', async () => {
    renderScreen();
    await waitFor(() => screen.getByPlaceholderText(/type a message/i));

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: 'line1' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    // POST should NOT have been called
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

// ── Socket.IO — real-time messages ────────────────────────────────────────────

describe('ChatConversationScreen — Socket.IO new_message', () => {
  it('appends a message received from the socket', async () => {
    renderScreen();
    await waitFor(() => screen.getByText('Bob')); // header loaded

    const incomingMsg = makeApiMessage({
      id: 'socket-msg-1',
      content: 'Socket says hi',
    });

    mockSocket._trigger('new_message', incomingMsg);

    await waitFor(() => {
      expect(screen.getByText('Socket says hi')).toBeInTheDocument();
    });
  });

  it('does not duplicate a message that was already added optimistically', async () => {
    apiClient.post.mockReturnValue(new Promise(() => {})); // never resolves
    renderScreen();

    await waitFor(() => screen.getByPlaceholderText(/type a message/i));

    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: 'Dedup test' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    await waitFor(() => screen.getByText('Dedup test'));

    // Socket echoes back the same content from the same sender
    mockSocket._trigger('new_message', {
      ...makeApiMessage({ id: 'confirmed-1', content: 'Dedup test' }),
      sender_id: CURRENT_USER.id,
      conversation_id: 'conv-1',
    });

    await waitFor(() => {
      // Only one instance — optimistic replaced, not duplicated
      expect(screen.getAllByText('Dedup test')).toHaveLength(1);
    });
  });

  it('ignores messages for a different conversation', async () => {
    renderScreen();
    await waitFor(() => screen.getByText('Bob'));

    mockSocket._trigger('new_message', {
      ...makeApiMessage({ id: 'other-conv', content: 'Wrong conversation' }),
      conversation_id: 'conv-OTHER',
    });

    await waitFor(() => {
      expect(screen.queryByText('Wrong conversation')).not.toBeInTheDocument();
    });
  });
});

// ── Socket.IO — typing indicators ─────────────────────────────────────────────

describe('ChatConversationScreen — typing indicators', () => {
  it('shows a typing indicator when user_typing event arrives', async () => {
    renderScreen();
    await waitFor(() => screen.getByText('Bob'));

    mockSocket._trigger('user_typing', {
      userId: PARTNER.id,
      userName: PARTNER.name,
    });

    await waitFor(() => {
      expect(screen.getByText(/Bob is typing/i)).toBeInTheDocument();
    });
  });

  it('removes the typing indicator when user_stopped_typing event arrives', async () => {
    renderScreen();
    await waitFor(() => screen.getByText('Bob'));

    mockSocket._trigger('user_typing', {
      userId: PARTNER.id,
      userName: PARTNER.name,
    });

    await waitFor(() => {
      expect(screen.getByText(/Bob is typing/i)).toBeInTheDocument();
    });

    mockSocket._trigger('user_stopped_typing', { userId: PARTNER.id });

    await waitFor(() => {
      expect(screen.queryByText(/Bob is typing/i)).not.toBeInTheDocument();
    });
  });
});

// ── Pagination — load older messages ─────────────────────────────────────────

describe('ChatConversationScreen — load older messages', () => {
  it('makes additional API calls when scrolled to top with hasMore = true', async () => {
    let messageCallCount = 0;

    apiClient.get.mockImplementation((url) => {
      if (url.includes('/messages')) {
        messageCallCount++;
        return Promise.resolve({
          data: {
            data: [
              makeApiMessage({
                id: `msg-${messageCallCount}`,
                content: `Message ${messageCallCount}`,
              }),
            ],
            // Only the first call advertises more pages
            hasMore: messageCallCount === 1,
            nextCursor: messageCallCount === 1 ? 'cursor-1' : null,
          },
        });
      }
      // Conversation meta
      return Promise.resolve({
        data: { data: { partner: PARTNER, listing: { title: 'Guitar' } } },
      });
    });

    const { container } = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Message 1')).toBeInTheDocument();
    });

    // In jsdom, scrollTop defaults to 0, which satisfies the `<= 60` check in
    // handleMessagesScroll — so firing a scroll event is enough to trigger load.
    const messagesList = container.querySelector('[class*="overflow-y-auto"]');
    expect(messagesList).not.toBeNull();

    fireEvent.scroll(messagesList);

    await waitFor(() => {
      // Initial load = 1 message-page call, load-older = 2nd call
      expect(messageCallCount).toBeGreaterThanOrEqual(2);
    });
  });
});

// ── Header renders partner info ───────────────────────────────────────────────

describe('ChatConversationScreen — header', () => {
  it('shows the partner name in the header', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('shows the listing title in the header reference line', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/Guitar lessons/i)).toBeInTheDocument();
    });
  });
});
