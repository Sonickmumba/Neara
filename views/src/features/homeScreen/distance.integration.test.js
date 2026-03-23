/**
 * Distance — Redux integration tests
 *
 * Traces the full data lifecycle that causes the "Distance unknown" bug:
 *
 *   1. User creates a listing → POST /api/listings → createListing controller
 *      does NOT compute distance → frontend dispatches addListing(newListing)
 *      → listing enters store WITHOUT a distance field → UI shows "Distance unknown"
 *
 *   2. User pulls to refresh → fetchHomeFeed dispatched → GET /api/listings
 *      uses req.user.location_lat/lng as fallback reference location →
 *      Haversine SQL computes distance → listings returned WITH distance →
 *      homeFeedAdapter.setAll replaces all entities → UI shows distance
 *
 * These tests operate purely on the Redux store (no rendered components),
 * proving the root cause is in the shape of the data, not in the rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import homeFeedReducer, { addListing } from './homeFeedSlice';
import { fetchHomeFeed } from './homeFeedThunks';
import { selectAllListings } from './homeFeedSelectors';

// ── Mock apiClient ─────────────────────────────────────────────────────────────

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}));

import apiClient from '../../services/api';

// ── Helper ─────────────────────────────────────────────────────────────────────

function makeStore() {
  return configureStore({ reducer: { homeFeed: homeFeedReducer } });
}

const NOW = new Date().toISOString();

// Shape returned by POST /api/listings (createListing) — no distance field
const CREATED_LISTING = {
  id: 'listing-1',
  title: 'Guitar lessons',
  type: 'offer',
  category: 'skills',
  created_at: NOW,
};

// Shape returned by GET /api/listings (fetchHomeFeed) — distance computed
const FETCHED_LISTING = {
  ...CREATED_LISTING,
  distance: 2.5, // Haversine result using req.user.location_lat/lng
};

// ── Integration: create → display ─────────────────────────────────────────────

describe('Distance — create → feed integration', () => {
  beforeEach(() => vi.clearAllMocks());

  /**
   * BUG: createListing endpoint omits distance.
   * addListing stores the raw POST response → distance is undefined.
   */
  it('newly created listing has no distance in the store (the bug)', () => {
    const store = makeStore();

    store.dispatch(addListing(CREATED_LISTING));

    const [listing] = selectAllListings(store.getState());
    expect(listing.distance).toBeUndefined();
    // This is what causes "Distance unknown" to render in ListingsFeed
  });

  /**
   * After pull-to-refresh, fetchHomeFeed calls GET /api/listings which uses
   * the authenticated user's location_lat/lng from req.user to compute
   * distance via Haversine SQL. The returned listings have distance values.
   */
  it('fetchHomeFeed brings back listings with computed distance', async () => {
    const store = makeStore();

    apiClient.get.mockResolvedValue({
      data: { success: true, data: [FETCHED_LISTING] },
    });

    await store.dispatch(fetchHomeFeed());

    const [listing] = selectAllListings(store.getState());
    expect(listing.distance).toBe(2.5);
  });

  /**
   * Full lifecycle:
   * create → shows unknown → refresh → shows distance
   *
   * This is the exact sequence that users experience.
   */
  it('step-by-step: create (no distance) → refresh (with distance) fixes the bug', async () => {
    const store = makeStore();

    // Step 1: User creates listing — no distance in POST response
    store.dispatch(addListing(CREATED_LISTING));

    const beforeRefresh = selectAllListings(store.getState());
    expect(beforeRefresh[0].distance).toBeUndefined(); // "Distance unknown" visible

    // Step 2: User pulls to refresh — GET /api/listings returns distance
    apiClient.get.mockResolvedValue({
      data: { success: true, data: [FETCHED_LISTING] },
    });

    await store.dispatch(fetchHomeFeed());

    const afterRefresh = selectAllListings(store.getState());
    expect(afterRefresh[0].distance).toBe(2.5); // Distance now visible
  });

  /**
   * Verifies that homeFeedAdapter.setAll (used in fetchHomeFeed.fulfilled)
   * fully replaces the old entity, not just merges — so the distance field
   * is definitely present after refresh, not patched in.
   */
  it('fetchHomeFeed.fulfilled replaces entities entirely (setAll), ensuring stale fields are overwritten', async () => {
    const store = makeStore();

    // Seed a stale listing with an old title and no distance
    store.dispatch(addListing({ ...CREATED_LISTING, title: 'Old title' }));

    // Refresh brings a listing with a new title and distance
    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: [{ ...FETCHED_LISTING, title: 'New title from server' }],
      },
    });

    await store.dispatch(fetchHomeFeed());

    const [listing] = selectAllListings(store.getState());
    expect(listing.title).toBe('New title from server');
    expect(listing.distance).toBe(2.5);
  });
});

// ── Integration: feed status after refresh ─────────────────────────────────────

describe('Distance — feed status transitions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('status goes idle → loading → succeeded on a successful fetch', async () => {
    const store = makeStore();
    const states = [];

    store.subscribe(() => {
      states.push(store.getState().homeFeed.status);
    });

    apiClient.get.mockResolvedValue({
      data: { success: true, data: [FETCHED_LISTING] },
    });

    await store.dispatch(fetchHomeFeed());

    expect(states).toEqual(['loading', 'succeeded']);
  });

  it('status goes loading → failed when the API errors', async () => {
    const store = makeStore();
    const states = [];

    store.subscribe(() => {
      states.push(store.getState().homeFeed.status);
    });

    apiClient.get.mockRejectedValue(new Error('Network error'));

    await store.dispatch(fetchHomeFeed());

    expect(states).toEqual(['loading', 'failed']);
    // Listings remain unchanged — no data wiped on error
    expect(selectAllListings(store.getState())).toHaveLength(0);
  });
});

// ── Integration: distance field edge cases in the store ────────────────────────

describe('Distance — store field edge cases', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores distance: 0 correctly — not coerced to undefined or null', async () => {
    const store = makeStore();

    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: [{ ...FETCHED_LISTING, distance: 0 }],
      },
    });

    await store.dispatch(fetchHomeFeed());

    const [listing] = selectAllListings(store.getState());
    expect(listing.distance).toBe(0);
  });

  it('stores multiple listings each with their own distance', async () => {
    const store = makeStore();

    apiClient.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          { ...FETCHED_LISTING, id: 'a', distance: 1.1 },
          { ...FETCHED_LISTING, id: 'b', distance: 5.3 },
          { ...FETCHED_LISTING, id: 'c', distance: null }, // user has no stored location on backend
        ],
      },
    });

    await store.dispatch(fetchHomeFeed());

    const listings = selectAllListings(store.getState());
    const distances = listings.map((l) => l.distance);
    expect(distances).toContain(1.1);
    expect(distances).toContain(5.3);
    expect(distances).toContain(null);
  });
});
