/**
 * ListingsFeed — unit tests
 *
 * Covers the distance display logic.
 *
 * The bug: listings added via `addListing` (after POST /api/listings) arrive
 * without a `distance` field, causing "Distance unknown" to render. Listings
 * fetched via `fetchHomeFeed` (GET /api/listings) carry a computed `distance`
 * value. These tests document both expected states.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ListingsFeed } from './ListingsFeed';

// ── Mock child components that make API / Redux calls ─────────────────────────
vi.mock('../../../components/FavoriteButton', () => ({
  FavoriteButton: () => null,
}));

vi.mock('../../../components/ReputableBadge', () => ({
  ReputationBadge: () => null,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// ── Shared fixture ─────────────────────────────────────────────────────────────
const BASE = {
  id: '1',
  type: 'offer',
  category: 'skills',
  title: 'Guitar lessons for beginners',
  description: 'Ten years of teaching experience, available weekends.',
  author_name: 'Alice',
  author_rating: 4.5,
  isverified: true,
  totalrating: 10,
  neighborhood: 'Downtown',
  timeAgo: '2 hours ago',
  responses_count: 3,
};

// ── distance display ───────────────────────────────────────────────────────────

describe('ListingsFeed — distance display', () => {
  it('shows distance in km when listing.distance is a positive number', () => {
    render(<ListingsFeed listings={[{ ...BASE, distance: 2.5 }]} />);
    expect(screen.getByText(/2\.5 km/)).toBeInTheDocument();
  });

  it('shows "Distance unknown" when listing.distance is null', () => {
    render(<ListingsFeed listings={[{ ...BASE, distance: null }]} />);
    expect(screen.getByText(/Distance unknown/)).toBeInTheDocument();
  });

  /**
   * BUG REPRODUCED:
   * POST /api/listings → createListing controller deliberately omits the
   * distance field. The frontend dispatches addListing(newListing) which
   * stores the listing without distance. ListingsFeed then renders
   * "Distance unknown" until the user refreshes.
   */
  it('shows "Distance unknown" when listing.distance is undefined — newly created listing bug', () => {
    const newListing = { ...BASE }; // no distance field — mirrors POST response
    render(<ListingsFeed listings={[newListing]} />);
    expect(screen.getByText(/Distance unknown/)).toBeInTheDocument();
  });

  it('shows "0 km" when listing.distance is exactly 0 — not treated as unknown', () => {
    render(<ListingsFeed listings={[{ ...BASE, distance: 0 }]} />);
    expect(screen.getByText(/0 km/)).toBeInTheDocument();
    expect(screen.queryByText(/Distance unknown/)).not.toBeInTheDocument();
  });

  it('displays the distance for every listing in a multi-listing feed', () => {
    const listings = [
      { ...BASE, id: '1', distance: 1.2 },
      { ...BASE, id: '2', distance: null },
      { ...BASE, id: '3' }, // no distance field
    ];

    render(<ListingsFeed listings={listings} />);

    expect(screen.getByText(/1\.2 km/)).toBeInTheDocument();
    expect(screen.getAllByText(/Distance unknown/)).toHaveLength(2);
  });
});

// ── empty / missing listings ──────────────────────────────────────────────────

describe('ListingsFeed — empty state', () => {
  it('shows fallback message when listings array is empty', () => {
    render(<ListingsFeed listings={[]} />);
    expect(screen.getByText(/No listings available/)).toBeInTheDocument();
  });

  it('shows fallback message when listings is null', () => {
    render(<ListingsFeed listings={null} />);
    expect(screen.getByText(/No listings available/)).toBeInTheDocument();
  });
});
