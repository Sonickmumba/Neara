import { describe, it, expect } from 'vitest';
import reducer, {
  resetFeed,
  addListing,
  setActiveTab,
  homeFeedAdapter,
} from './homeFeedSlice';

const EMPTY_STATE = homeFeedAdapter.getInitialState({
  status: 'idle',
  error: null,
  nextCursor: null,
  activeTab: 'all',
});

const SAMPLE_LISTING = {
  id: '1',
  title: 'Free bike',
  type: 'offer',
  created_at: new Date().toISOString(),
};

// ─── resetFeed ────────────────────────────────────────────────────────────────

describe('homeFeedSlice › resetFeed', () => {
  it('clears all listings from the store', () => {
    const stateWithListing = reducer(EMPTY_STATE, addListing(SAMPLE_LISTING));
    expect(stateWithListing.ids).toHaveLength(1);

    const after = reducer(stateWithListing, resetFeed());
    expect(after.ids).toHaveLength(0);
    expect(after.entities).toEqual({});
  });

  it('resets status to "idle"', () => {
    const loadedState = { ...EMPTY_STATE, status: 'succeeded' };
    const after = reducer(loadedState, resetFeed());
    expect(after.status).toBe('idle');
  });

  it('clears the error field', () => {
    const failedState = {
      ...EMPTY_STATE,
      status: 'failed',
      error: 'Network error',
    };
    const after = reducer(failedState, resetFeed());
    expect(after.error).toBeNull();
  });

  it('clears nextCursor', () => {
    const cursorState = { ...EMPTY_STATE, nextCursor: 'cursor_abc123' };
    const after = reducer(cursorState, resetFeed());
    expect(after.nextCursor).toBeNull();
  });

  it('does not affect activeTab', () => {
    const tabState = reducer(EMPTY_STATE, setActiveTab('offers'));
    const after = reducer(tabState, resetFeed());
    expect(after.activeTab).toBe('offers');
  });
});
