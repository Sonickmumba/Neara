import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh, THRESHOLD, MAX_PULL } from './usePullToRefresh';

// Captured handlers — populated when the hook calls document.addEventListener
let capturedHandlers = {};

beforeEach(() => {
  capturedHandlers = {};

  // requestAnimationFrame runs its callback synchronously so state updates
  // are visible immediately in tests
  vi.stubGlobal('requestAnimationFrame', (cb) => { cb(); return 1; });
  vi.stubGlobal('cancelAnimationFrame', () => {});

  // Intercept addEventListener to grab the handlers the hook registers
  const origAdd = document.addEventListener.bind(document);
  vi.spyOn(document, 'addEventListener').mockImplementation((type, handler, opts) => {
    capturedHandlers[type] = handler;
    origAdd(type, handler, opts);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// hook's internal gesture handlers with plain mock events
function gesture({ startY, moveY, lift = true }) {
  act(() => capturedHandlers.touchstart?.({ touches: [{ clientY: startY }] }));
  act(() => capturedHandlers.touchmove?.({ touches: [{ clientY: moveY }] }));
  if (lift) act(() => capturedHandlers.touchend?.({}));
}

// ─── usePullToRefresh hook ────────────────────────────────────────────────────

describe('usePullToRefresh', () => {
  it('calls onRefresh when pull distance exceeds the threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePullToRefresh(onRefresh));

    gesture({ startY: 0, moveY: THRESHOLD + 10 });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onRefresh when pull distance is below the threshold', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() => usePullToRefresh(onRefresh));

    gesture({ startY: 0, moveY: THRESHOLD - 10 });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('resets pullDistance to 0 after touchend', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh(onRefresh));

    gesture({ startY: 0, moveY: THRESHOLD + 10 });

    expect(result.current.pullDistance).toBe(0);
  });

  it('caps pullDistance at MAX_PULL regardless of how far the user pulls', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh(onRefresh));

    // Pull without lifting (no touchend) to read intermediate pullDistance
    gesture({ startY: 0, moveY: MAX_PULL + 200, lift: false });

    expect(result.current.pullDistance).toBe(MAX_PULL);

    // Clean up
    act(() => capturedHandlers.touchend?.({}));
  });

  it('ignores upward swipes (endY < startY)', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh(onRefresh));

    // Swipe upward — delta is negative
    gesture({ startY: 200, moveY: 100 });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(result.current.pullDistance).toBe(0);
  });

  it('sets isRefreshing to true while onRefresh is pending', async () => {
    let resolveRefresh;
    const onRefresh = vi.fn(
      () => new Promise((res) => { resolveRefresh = res; })
    );
    const { result } = renderHook(() => usePullToRefresh(onRefresh));

    gesture({ startY: 0, moveY: THRESHOLD + 10 });

    // onRefresh is still pending — then isRefreshing should be true
    expect(result.current.isRefreshing).toBe(true);

    // Settle the promise
    await act(async () => { resolveRefresh(); });

    expect(result.current.isRefreshing).toBe(false);
  });

  it('does not trigger a second refresh while one is already in progress', async () => {
    let resolveRefresh;
    const onRefresh = vi.fn(
      () => new Promise((res) => { resolveRefresh = res; })
    );
    renderHook(() => usePullToRefresh(onRefresh));

    // First pull — triggers refresh
    gesture({ startY: 0, moveY: THRESHOLD + 10 });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Second pull while still refreshing — should be ignored
    gesture({ startY: 0, moveY: THRESHOLD + 10 });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await act(async () => { resolveRefresh(); });
  });

  it('removes all touch event listeners on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    const { unmount } = renderHook(() => usePullToRefresh(onRefresh));
    unmount();

    const removedTypes = removeSpy.mock.calls.map(([type]) => type);
    expect(removedTypes).toContain('touchstart');
    expect(removedTypes).toContain('touchmove');
    expect(removedTypes).toContain('touchend');
  });
});
