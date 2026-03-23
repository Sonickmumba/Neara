import { useState, useRef, useEffect, useCallback } from 'react';

// Minimum pull distance (px) to trigger a refresh
const THRESHOLD = 80;
// Maximum visual pull travel (px) — caps the indicator movement
const MAX_PULL = 120;

/**
 * usePullToRefresh
 *
 * Detects a downward touch pull at the top of the page and calls `onRefresh`.
 * Designed for web (document-level touch events). Zero coupling to Redux.
 *
 * @param {() => Promise<void>} onRefresh - async function called when the pull
 *   exceeds the threshold and the user lifts their finger
 * @returns {{ pullDistance: number, isRefreshing: boolean }}
 *   pullDistance – current visual pull in px (0 when idle or refreshing)
 *   isRefreshing – true while onRefresh is awaiting
 */
export function usePullToRefresh(onRefresh) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs hold mutable values that must NOT trigger re-renders
  const touchStartYRef = useRef(0);
  // Explicit tracking flag — avoids falsy-zero bug when the touch starts at y=0
  const isTrackingRef = useRef(false);
  const rafIdRef = useRef(null);
  // Mirror isRefreshing in a ref so event handlers always read the latest value
  // without needing to be re-created on every render
  const isRefreshingRef = useRef(false);

  const startRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  const onTouchStart = useCallback((e) => {
    // Ignore if already refreshing or not scrolled to the very top
    if (isRefreshingRef.current) return;
    if (window.scrollY > 0) return;
    touchStartYRef.current = e.touches[0].clientY;
    isTrackingRef.current = true;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (isRefreshingRef.current || !isTrackingRef.current) return;
    // If the user scrolled down mid-gesture, abort the pull
    if (window.scrollY > 0) {
      isTrackingRef.current = false;
      touchStartYRef.current = 0;
      setPullDistance(0);
      return;
    }

    const delta = e.touches[0].clientY - touchStartYRef.current;
    if (delta <= 0) return; // upward swipe — ignore

    // Batch DOM-paint work in a single animation frame
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      setPullDistance(Math.min(delta, MAX_PULL));
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!isTrackingRef.current) return;
    isTrackingRef.current = false;

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

    // Use the updater form to read committed pullDistance without stale closure
    setPullDistance((current) => {
      if (current >= THRESHOLD) {
        startRefresh();
      }
      return 0; // always reset visual pull
    });

    touchStartYRef.current = 0;
  }, [startRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  return { pullDistance, isRefreshing };
}

// Export constants so tests can use them without magic numbers
export { THRESHOLD, MAX_PULL };
