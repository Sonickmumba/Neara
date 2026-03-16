import { Heart } from 'lucide-react';
import { useFavoriteToggle } from '../hooks/useFavoriteToggle';

export function FavoriteButton({ 
  listingId, 
  initialIsFavorited = false, 
  size = 'md',
  className = ''
}) {
  const { isFavorited, hasChecked, isLoading, toggleFavorite } = useFavoriteToggle({
    listingId,
    initialIsFavorited,
  });

  // Don't render until we've checked the favorite status from the server
  if (!hasChecked) {
    return null;
  }

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    toggleFavorite();
  };


  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`${sizeClasses[size]} rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 ${className}`}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart 
        className={`${iconSizes[size]} transition-all ${
          isFavorited 
            ? 'fill-red-500 text-red-500' 
            : 'text-gray-400 hover:text-red-500'
        }`}
      />
    </button>
  );
}
