/**
 * ChatConversationScreen — emoji picker tests
 *
 * Covers:
 *   - Smile button is always rendered in the input area
 *   - Clicking Smile opens the emoji picker
 *   - Clicking Smile again toggles (closes) the picker
 *   - Selecting an emoji inserts it into the textarea and closes the picker
 *   - Send button appears after emoji is inserted
 *   - Clicking outside the picker closes it
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ChatConversationScreen } from './ChatConversationScreen';

// ── Module mocks ───────────────────────────────────────────────────────────────

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

// Mock emoji-picker-react — renders a simple test double
vi.mock('emoji-picker-react', () => ({
  default: ({ onEmojiClick }) => (
    <div data-testid="emoji-picker">
      <button type="button" onClick={() => onEmojiClick({ emoji: '😊' })}>
        😊
      </button>
    </div>
  ),
}));

// ── Test helpers ───────────────────────────────────────────────────────────────

import apiClient from '../../services/api';

const CURRENT_USER = { id: 'user-1', name: 'Alice' };

const authReducer = (state = { user: CURRENT_USER }) => state;

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

function makeEmptyApiResponses() {
  apiClient.get.mockImplementation(() =>
    Promise.resolve({
      data: {
        data: {
          id: 'conv-1',
          partner: { id: 'user-2', name: 'Bob', profile_image_url: null },
          listing: { id: 'listing-1', title: 'Guitar lessons' },
        },
        hasMore: false,
        nextCursor: null,
      },
    })
  );
}

function makeMockSocket() {
  const handlers = {};
  return {
    on: vi.fn((event, cb) => {
      handlers[event] = cb;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    get connected() {
      return false;
    },
    _trigger: (event, data) => handlers[event]?.(data),
  };
}

function renderScreen() {
  return render(
    <Provider store={makeStore()}>
      <ChatConversationScreen />
    </Provider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSocket = makeMockSocket();
  makeEmptyApiResponses();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ChatConversationScreen — emoji picker', () => {
  it('renders the emoji (Smile) button in the input area', async () => {
    renderScreen();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /open emoji picker/i })
      ).toBeInTheDocument()
    );
  });

  it('opens the emoji picker when the Smile button is clicked', async () => {
    renderScreen();
    await waitFor(() =>
      screen.getByRole('button', { name: /open emoji picker/i })
    );

    fireEvent.click(screen.getByRole('button', { name: /open emoji picker/i }));

    await waitFor(() =>
      expect(screen.getByTestId('emoji-picker')).toBeInTheDocument()
    );
  });

  it('closes the picker when Smile is clicked a second time', async () => {
    renderScreen();
    await waitFor(() =>
      screen.getByRole('button', { name: /open emoji picker/i })
    );

    const smileBtn = screen.getByRole('button', { name: /open emoji picker/i });
    fireEvent.click(smileBtn); // open
    await waitFor(() => screen.getByTestId('emoji-picker'));

    fireEvent.click(smileBtn); // close
    await waitFor(() =>
      expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument()
    );
  });

  it('inserts the emoji into the textarea when selected', async () => {
    renderScreen();
    await waitFor(() =>
      screen.getByRole('button', { name: /open emoji picker/i })
    );

    fireEvent.click(screen.getByRole('button', { name: /open emoji picker/i }));
    await waitFor(() => screen.getByTestId('emoji-picker'));

    fireEvent.click(screen.getByText('😊'));

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/type a message/i)).toHaveValue('😊')
    );
  });

  it('closes the picker after selecting an emoji', async () => {
    renderScreen();
    await waitFor(() =>
      screen.getByRole('button', { name: /open emoji picker/i })
    );

    fireEvent.click(screen.getByRole('button', { name: /open emoji picker/i }));
    await waitFor(() => screen.getByTestId('emoji-picker'));

    fireEvent.click(screen.getByText('😊'));

    await waitFor(() =>
      expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument()
    );
  });

  it('shows the Send button after an emoji is inserted', async () => {
    renderScreen();
    await waitFor(() =>
      screen.getByRole('button', { name: /open emoji picker/i })
    );

    fireEvent.click(screen.getByRole('button', { name: /open emoji picker/i }));
    await waitFor(() => screen.getByTestId('emoji-picker'));
    fireEvent.click(screen.getByText('😊'));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /send message/i })
      ).toBeInTheDocument()
    );
  });

  it('closes the picker when clicking outside of it', async () => {
    renderScreen();
    await waitFor(() =>
      screen.getByRole('button', { name: /open emoji picker/i })
    );

    fireEvent.click(screen.getByRole('button', { name: /open emoji picker/i }));
    await waitFor(() => screen.getByTestId('emoji-picker'));

    // Simulate mousedown outside the picker
    fireEvent.mouseDown(document.body);

    await waitFor(() =>
      expect(screen.queryByTestId('emoji-picker')).not.toBeInTheDocument()
    );
  });
});
