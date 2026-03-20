/**
 * ListingDetails — unit tests
 *
 * Covers the distance display bug:
 *   GET /api/listings/:id  (getListingsById) never runs the Haversine SQL.
 *   The listing row is returned without a distance column, so the UI always
 *   shows "Distance unknown" regardless of the viewer's location.
 *
 *   This is different from the feed bug (which only affects newly created
 *   listings until the next refresh). Here, the bug is permanent — no
 *   refresh from this page will ever fix it because the endpoint never
 *   computes distance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ListingDetails } from './ListingDetails';
import apiClient from '../../services/api';

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../../components/FavoriteButton', () => ({
  FavoriteButton: () => null,
}));

vi.mock('../../components/ReputableBadge', () => ({
  ReputationBadge: () => null,
}));

vi.mock('../../utils/date.js', () => ({
  formatMonthYear: () => 'January 2025',
}));

// ── Test helpers ───────────────────────────────────────────────────────────────

// Minimal store (ListingDetails only needs auth.user)
const authReducer = (state = { user: { id: 'viewer-1' } }) => state;

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

function renderDetails(listingId = '123') {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={[`/listing-details/${listingId}`]}>
        <Routes>
          <Route
            path="/listing-details/:selectedListingId"
            element={<ListingDetails />}
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

// Fixture that mirrors what getListingsById actually returns (no distance)
const BASE = {
  id: '123',
  title: 'Guitar lessons',
  type: 'offer',
  category: 'skills',
  description: 'Teaching guitar for beginners.',
  author_name: 'Alice',
  author_rating: 4.5,
  isverified: true,
  totalrating: 10,
  neighborhood: 'Downtown',
  timeAgo: '2 hours ago',
  responses_count: 2,
  completedtrades: 5,
  created_at: '2025-01-01T00:00:00Z',
  user_id: 'user-2',
  // distance is intentionally absent — mirrors the real API response
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default: main listing resolves, similar returns empty
  apiClient.get.mockImplementation((url) => {
    if (url.includes('/similar')) {
      return Promise.resolve({ data: { success: true, data: [] } });
    }
    return Promise.resolve({ data: { success: true, data: BASE } });
  });
});

// ── distance display ───────────────────────────────────────────────────────────

describe('ListingDetails — distance display', () => {
  /**
   * ROOT CAUSE BUG:
   * getListingsById SQL query has no Haversine distance expression.
   * distance is never present in the response → always shows "Distance unknown".
   */
  it('shows "Distance unknown" when API returns listing without distance — persistent bug on detail page', async () => {
    renderDetails();

    await waitFor(() => {
      expect(screen.getByText(/Distance unknown/i)).toBeInTheDocument();
    });
  });

  it('shows "Distance unknown" when distance is explicitly null', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/similar'))
        return Promise.resolve({ data: { success: true, data: [] } });
      return Promise.resolve({
        data: { success: true, data: { ...BASE, distance: null } },
      });
    });

    renderDetails();

    await waitFor(() => {
      expect(screen.getByText(/Distance unknown/i)).toBeInTheDocument();
    });
  });

  it('shows distance in km when the API response includes a distance value', async () => {
    // This tests the fix path — after the endpoint is updated to compute distance
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/similar'))
        return Promise.resolve({ data: { success: true, data: [] } });
      return Promise.resolve({
        data: { success: true, data: { ...BASE, distance: 3.2 } },
      });
    });

    renderDetails();

    await waitFor(() => {
      expect(screen.getByText(/3\.2 km/)).toBeInTheDocument();
      expect(screen.queryByText(/Distance unknown/i)).not.toBeInTheDocument();
    });
  });

  it('shows "0 km" when distance is exactly 0 — not treated as unknown', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/similar'))
        return Promise.resolve({ data: { success: true, data: [] } });
      return Promise.resolve({
        data: { success: true, data: { ...BASE, distance: 0 } },
      });
    });

    renderDetails();

    await waitFor(() => {
      expect(screen.getByText(/0 km/)).toBeInTheDocument();
      expect(screen.queryByText(/Distance unknown/i)).not.toBeInTheDocument();
    });
  });
});

// ── similar listings distance ─────────────────────────────────────────────────

describe('ListingDetails — similar listings distance display', () => {
  it('shows "Distance unknown" for similar listings that have no distance field', async () => {
    const similarListing = {
      id: 'sim-1',
      title: 'Piano lessons',
      category: 'skills',
      author_name: 'Bob',
      neighborhood: 'Uptown',
      timeAgo: '1 hour ago',
      // no distance
    };

    apiClient.get.mockImplementation((url) => {
      if (url.includes('/similar'))
        return Promise.resolve({
          data: { success: true, data: [similarListing] },
        });
      return Promise.resolve({ data: { success: true, data: BASE } });
    });

    renderDetails();

    await waitFor(() => {
      // Both the main listing AND the similar listing show "Distance unknown"
      expect(
        screen.getAllByText(/Distance unknown/i).length
      ).toBeGreaterThanOrEqual(2);
    });
  });

  it('shows distance for similar listings when distance is present', async () => {
    const similarListing = {
      id: 'sim-1',
      title: 'Piano lessons',
      category: 'skills',
      author_name: 'Bob',
      neighborhood: 'Uptown',
      timeAgo: '1 hour ago',
      distance: 1.8,
    };

    apiClient.get.mockImplementation((url) => {
      if (url.includes('/similar'))
        return Promise.resolve({
          data: { success: true, data: [similarListing] },
        });
      return Promise.resolve({ data: { success: true, data: BASE } });
    });

    renderDetails();

    await waitFor(() => {
      expect(screen.getByText(/1\.8 km/)).toBeInTheDocument();
    });
  });
});

// ── loading and error states ──────────────────────────────────────────────────

describe('ListingDetails — loading and error states', () => {
  it('shows a loading spinner before the API resolves', () => {
    apiClient.get.mockReturnValue(new Promise(() => {})); // never resolves
    renderDetails();
    expect(screen.getByText(/Loading listing details/i)).toBeInTheDocument();
  });

  it('shows "Listing not found" when API returns a 404', async () => {
    const err = new Error('Not found');
    err.response = { status: 404 };
    apiClient.get.mockRejectedValue(err);

    renderDetails();

    await waitFor(() => {
      expect(screen.getByText(/Listing not found/i)).toBeInTheDocument();
    });
  });

  it('shows a generic error message on non-404 API failure', async () => {
    const err = new Error('Server error');
    err.response = { status: 500 };
    apiClient.get.mockRejectedValue(err);

    renderDetails();

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load listing details/i)
      ).toBeInTheDocument();
    });
  });
});
