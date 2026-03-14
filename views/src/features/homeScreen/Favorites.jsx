import { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import { ListingsFeed } from './components/ListingsFeed';

export function Favorites() {
  const [listings, setListings] = useState([]);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    async function fetchFavorites() {
      setStatus('loading');
      try {
        const res = await apiClient.get('/api/favorites');
        setListings(res.data.data || []);
      } catch (err) {
        console.error('failed to load favorites', err);
      } finally {
        setStatus('idle');
      }
    }

    fetchFavorites();
  }, []);

  const handleFavoriteToggle = (listingId, e) => {
    e.stopPropagation();
    // The toggle action is handled inside listing component/hook
  };

  if (status === 'loading') {
    return <p className="p-6 text-gray-600">Loading favorites…</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <h2 className="px-4 py-4 text-xl font-semibold">Your Favorites</h2>
      <div className="px-4 py-4 space-y-4">
        <ListingsFeed
          listings={listings}
          onFavoriteToggle={handleFavoriteToggle}
        />
      </div>
    </div>
  );
}
