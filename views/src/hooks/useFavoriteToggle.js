import { useEffect, useRef, useState, useCallback } from 'react';
import apiClient from '../services/api';
import { toast } from 'sonner';

export function useFavoriteToggle({ listingId, initialIsFavorited = false }) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [hasChecked, setHasChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inFlightRef = useRef(false);

  /* 🔍 Check favorite status on mount */
  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        const res = await apiClient.get(`/api/favorites/check/${listingId}`);

        if (mounted) {
          setIsFavorited(res.data.data.isFavorited);
          setHasChecked(true);
        }
      } catch (err) {
        // ignore auth errors; we just want the button to render
        if (mounted) setHasChecked(true);
      }
    }

    if (listingId) {
      fetchStatus();
    }

    return () => {
      mounted = false;
    };
  }, [listingId]);

  /* 🔁 Toggle favorite */
  const toggleFavorite = useCallback(async () => {
    if (inFlightRef.current) return;

    const previousState = isFavorited;
    const nextState = !previousState;

    inFlightRef.current = true;
    setIsLoading(true);

    // 🚀 Optimistic update (without toast)
    setIsFavorited(nextState);

    try {
      if (nextState) {
        await apiClient.post(`/api/favorites`, { listingId });
        // ✅ Show success toast ONLY after API succeeds
        toast.success('Added to favorites');
      } else {
        await apiClient.delete(`/api/favorites/${listingId}`);
        // ✅ Show success toast ONLY after API succeeds
        toast.success('Removed from favorites');
      }
    } catch (err) {
      // ❌ Rollback optimistic update
      setIsFavorited(previousState);

      if (err.response?.status === 401) {
        toast.error('Please log in to save favorites');
      } else {
        toast.error(
          err.response?.data?.message || 'Failed to update favorites'
        );
      }
      console.error('Favorite toggle error:', err);
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [listingId, isFavorited]);

  return {
    isFavorited,
    hasChecked,
    toggleFavorite,
    isLoading,
  };
}
