import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

export function useFavoriteToggle({
  listingId,
  initialIsFavorited = false,
}) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [hasChecked, setHasChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const inFlightRef = useRef(false);

  /* 🔍 Check favorite status on mount */
  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        const res = await axios.get(
          `http://localhost:3000/api/favorites/check/${listingId}`,
          { withCredentials: true }
        );

        if (mounted) {
          setIsFavorited(res.data.data.isFavorited);
          setHasChecked(true);
        }
      } catch {
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
        await axios.post(
          'http://localhost:3000/api/favorites',
          { listingId },
          { withCredentials: true }
        );
        // ✅ Show success toast ONLY after API succeeds
        toast.success('Added to favorites');
      } else {
        await axios.delete(
          `http://localhost:3000/api/favorites/${listingId}`,
          { withCredentials: true }
        );
        // ✅ Show success toast ONLY after API succeeds
        toast.success('Removed from favorites');
      }
    } catch (err) {
      // ❌ Rollback optimistic update
      setIsFavorited(previousState);
      
      // ❌ Show error toast (only one toast now)
      toast.error(
        err.response?.data?.message || 'Failed to update favorites'
      );
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