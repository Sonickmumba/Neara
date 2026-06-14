/**
 * ChatConversationScreen — attachment tests
 *
 * Covers:
 *   - Paperclip (file picker) button is rendered
 *   - Hidden file input is present in the DOM
 *   - Oversized image is rejected with a toast (no API call)
 *   - Oversized document is rejected with a toast (no API call)
 *   - Disallowed file type is rejected with a toast
 *   - Selecting a valid image shows the upload spinner (Loader2)
 *   - After successful upload, image preview chip appears
 *   - After successful upload, document chip (FileText icon) appears for PDF
 *   - Dismiss (X) button removes the attachment chip
 *   - Send button appears after a successful upload (no text needed)
 *   - Sending includes attachment fields in the POST payload
 *   - Attachment-only message can be sent (empty text field)
 *   - Image attachment renders as <img> in the message bubble
 *   - Document attachment renders as a link in the message bubble
 *   - Upload API failure shows toast error and clears the chip
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
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
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
import { toast } from 'sonner';

const CURRENT_USER = { id: 'user-1', name: 'Alice' };
const authReducer = (state = { user: CURRENT_USER }) => state;

const ATTACHMENT_URL =
  'https://res.cloudinary.com/demo/neara-chat-attachments/photo.jpg';
const DOC_URL =
  'https://res.cloudinary.com/demo/neara-chat-attachments/doc.pdf';

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

function makeFile({
  name = 'photo.jpg',
  type = 'image/jpeg',
  sizeBytes = 500 * 1024,
} = {}) {
  return new File(['x'.repeat(sizeBytes)], name, { type });
}

function renderScreen() {
  return render(
    <Provider store={makeStore()}>
      <ChatConversationScreen />
    </Provider>
  );
}

// jsdom does not implement createObjectURL / revokeObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
globalThis.URL.revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockSocket = makeMockSocket();
  makeEmptyApiResponses();
  apiClient.patch.mockResolvedValue({ data: { success: true } });
  globalThis.URL.createObjectURL.mockReturnValue('blob:mock-url');
  // jsdom does not implement scrollIntoView — mock it globally
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// ── Render ─────────────────────────────────────────────────────────────────────

describe('ChatConversationScreen — attachment button', () => {
  it('renders the file picker (Paperclip) button', async () => {
    renderScreen();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /open file picker/i })
      ).toBeInTheDocument()
    );
  });

  it('renders a hidden file input with correct accept attribute', async () => {
    renderScreen();
    await waitFor(() =>
      screen.getByRole('button', { name: /open file picker/i })
    );
    const input = screen.getByLabelText(/attach file/i);
    expect(input).toBeInTheDocument();
    expect(input.getAttribute('accept')).toMatch(/image\/jpeg/);
    expect(input.getAttribute('accept')).toMatch(/application\/pdf/);
  });
});

// ── Client-side validation ─────────────────────────────────────────────────────

describe('ChatConversationScreen — attachment validation', () => {
  async function waitForReady() {
    renderScreen();
    await waitFor(() =>
      screen.getByRole('button', { name: /open file picker/i })
    );
  }

  it('rejects images larger than 10 MB with a toast error', async () => {
    await waitForReady();
    const bigFile = makeFile({ sizeBytes: 11 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText(/attach file/i), {
      target: { files: [bigFile] },
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/10 mb/i));
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('rejects documents larger than 5 MB with a toast error', async () => {
    await waitForReady();
    const bigDoc = makeFile({
      name: 'big.pdf',
      type: 'application/pdf',
      sizeBytes: 6 * 1024 * 1024,
    });
    fireEvent.change(screen.getByLabelText(/attach file/i), {
      target: { files: [bigDoc] },
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/5 mb/i));
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('rejects disallowed file types with a toast error', async () => {
    await waitForReady();
    const svgFile = makeFile({ name: 'icon.svg', type: 'image/svg+xml' });
    fireEvent.change(screen.getByLabelText(/attach file/i), {
      target: { files: [svgFile] },
    });
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

// ── Upload flow ────────────────────────────────────────────────────────────────

describe('ChatConversationScreen — attachment upload', () => {
  async function waitForReady() {
    renderScreen();
    await waitFor(() =>
      screen.getByRole('button', { name: /open file picker/i })
    );
  }

  it('shows a spinner while the upload is in-flight', async () => {
    // Never resolves — keeps spinner visible
    apiClient.post.mockReturnValue(new Promise(() => {}));

    await waitForReady();
    fireEvent.change(screen.getByLabelText(/attach file/i), {
      target: { files: [makeFile()] },
    });

    await waitFor(() => {
      // The Paperclip button should now be disabled (spinner replaces icon)
      expect(
        screen.getByRole('button', { name: /open file picker/i })
      ).toBeDisabled();
    });
  });

  it('shows an image preview chip after a successful image upload', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          attachment_url: ATTACHMENT_URL,
          attachment_type: 'image',
          attachment_name: 'photo.jpg',
        },
      },
    });

    await waitForReady();
    fireEvent.change(screen.getByLabelText(/attach file/i), {
      target: { files: [makeFile()] },
    });

    await waitFor(() => {
      expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    });
    // Preview img should use the blob URL
    expect(screen.getByAltText('photo.jpg')).toBeInTheDocument();
  });

  it('shows a document icon chip after a successful PDF upload', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          attachment_url: DOC_URL,
          attachment_type: 'document',
          attachment_name: 'report.pdf',
        },
      },
    });

    await waitForReady();
    const pdfFile = makeFile({
      name: 'report.pdf',
      type: 'application/pdf',
      sizeBytes: 200 * 1024,
    });
    fireEvent.change(screen.getByLabelText(/attach file/i), {
      target: { files: [pdfFile] },
    });

    await waitFor(() => {
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });
  });

  it('removes the attachment chip when the dismiss (X) button is clicked', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          attachment_url: ATTACHMENT_URL,
          attachment_type: 'image',
          attachment_name: 'photo.jpg',
        },
      },
    });

    await waitForReady();
    fireEvent.change(screen.getByLabelText(/attach file/i), {
      target: { files: [makeFile()] },
    });
    await waitFor(() => screen.getByText('photo.jpg'));

    fireEvent.click(screen.getByRole('button', { name: /remove attachment/i }));

    await waitFor(() => {
      expect(screen.queryByText('photo.jpg')).not.toBeInTheDocument();
    });
  });

  it('shows the Send button after a successful upload (no text needed)', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          attachment_url: ATTACHMENT_URL,
          attachment_type: 'image',
          attachment_name: 'photo.jpg',
        },
      },
    });

    await waitForReady();
    fireEvent.change(screen.getByLabelText(/attach file/i), {
      target: { files: [makeFile()] },
    });
    await waitFor(() => screen.getByText('photo.jpg'));

    expect(
      screen.getByRole('button', { name: /send message/i })
    ).toBeInTheDocument();
  });

  it('shows a toast error and clears spinner on upload failure', async () => {
    apiClient.post.mockRejectedValue(
      Object.assign(new Error('fail'), {
        response: { data: { message: 'Upload failed' } },
      })
    );

    await waitForReady();
    fireEvent.change(screen.getByLabelText(/attach file/i), {
      target: { files: [makeFile()] },
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/upload failed/i)
      );
    });
    // Paperclip button should be re-enabled (no longer uploading)
    expect(
      screen.getByRole('button', { name: /open file picker/i })
    ).not.toBeDisabled();
  });
});

// ── Send with attachment ───────────────────────────────────────────────────────

describe('ChatConversationScreen — send with attachment', () => {
  async function setupWithAttachment(attachmentType = 'image') {
    renderScreen();
    await waitFor(() =>
      screen.getByRole('button', { name: /open file picker/i })
    );

    // First POST call is the attachment upload
    apiClient.post.mockResolvedValueOnce({
      data: {
        data: {
          attachment_url: ATTACHMENT_URL,
          attachment_type: attachmentType,
          attachment_name: attachmentType === 'image' ? 'photo.jpg' : 'doc.pdf',
        },
      },
    });

    const file =
      attachmentType === 'image'
        ? makeFile()
        : makeFile({
            name: 'doc.pdf',
            type: 'application/pdf',
            sizeBytes: 200 * 1024,
          });

    fireEvent.change(screen.getByLabelText(/attach file/i), {
      target: { files: [file] },
    });

    await waitFor(() => screen.getByRole('button', { name: /send message/i }));

    // Second POST call is the message send
    apiClient.post.mockResolvedValueOnce({
      data: {
        data: {
          id: 'msg-new',
          sender_id: 'user-1',
          sender_name: 'Alice',
          content: null,
          attachment_url: ATTACHMENT_URL,
          attachment_type: attachmentType,
          attachment_name: attachmentType === 'image' ? 'photo.jpg' : 'doc.pdf',
          created_at: new Date().toISOString(),
          is_read: false,
          conversation_id: 'conv-1',
        },
      },
    });
  }

  it('includes attachment fields in the POST /messages payload', async () => {
    await setupWithAttachment('image');

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      const calls = apiClient.post.mock.calls;
      const sendCall = calls.find((c) => c[0].includes('/messages'));
      expect(sendCall).toBeTruthy();
      expect(sendCall[1]).toMatchObject({
        attachment_url: ATTACHMENT_URL,
        attachment_type: 'image',
        attachment_name: 'photo.jpg',
      });
    });
  });

  it('sends an attachment-only message when the text field is empty', async () => {
    await setupWithAttachment('image');

    // Ensure text field is empty
    expect(screen.getByPlaceholderText(/type a message/i)).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      const calls = apiClient.post.mock.calls;
      const sendCall = calls.find((c) => c[0].includes('/messages'));
      expect(sendCall[1]).not.toHaveProperty('content');
      expect(sendCall[1]).toHaveProperty('attachment_url', ATTACHMENT_URL);
    });
  });

  it('renders an image attachment in the message bubble after send', async () => {
    await setupWithAttachment('image');
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      // The optimistic bubble should show an img using the blob URL
      const imgs = screen.queryAllByRole('img');
      const attachmentImg = imgs.find(
        (img) => img.src === 'blob:mock-url' || img.alt === 'photo.jpg'
      );
      expect(attachmentImg).toBeTruthy();
    });
  });

  it('renders a document link in the message bubble after send', async () => {
    await setupWithAttachment('document');
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText('doc.pdf')).toBeInTheDocument();
    });
  });
});
