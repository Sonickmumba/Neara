import { Star, CheckCircle } from 'lucide-react';

export function ReputationBadge({ 
  rating, 
  totalRatings, 
  isVerified = false, 
  size = 'md',
  showVerified = true 
}) {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="flex items-center gap-2">
      {rating > 0 && (
        <div className="flex items-center gap-1">
          <Star className={`${iconSizes[size]} text-yellow-500 fill-yellow-500`} />
          <span className={`${sizeClasses[size]} font-medium`}>
            {rating.toFixed(1)}
          </span>
          {totalRatings && totalRatings > 0 && (
            <span className={`${sizeClasses[size]} text-gray-500`}>
              ({totalRatings})
            </span>
          )}
        </div>
      )}
      
      {showVerified && isVerified && (
        <div className="flex items-center gap-1 text-blue-600">
          <CheckCircle className={`${iconSizes[size]}`} />
          <span className={`${sizeClasses[size]}`}>Verified</span>
        </div>
      )}
    </div>
  );
}
