import { Star, CheckCircle } from 'lucide-react';

export function ReputationBadge({
  rating,
  totalRatings,
  isVerified,
  size = 'md',
  showVerified = true,
}) {
  const normalizedSize = size === 'small' ? 'sm' : size;
  const numericRating = Number(rating);
  const hasValidRating = Number.isFinite(numericRating) && numericRating > 0;
  const numericTotalRatings = Number(totalRatings);
  const hasTotalRatings =
    Number.isFinite(numericTotalRatings) && numericTotalRatings > 0;

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex items-center gap-2">
      {hasValidRating && (
        <div className="flex items-center gap-1">
          <Star
            className={`${iconSizes[normalizedSize] || iconSizes.md} text-yellow-500 fill-yellow-500`}
          />
          <span
            className={`${sizeClasses[normalizedSize] || sizeClasses.md} font-medium`}
          >
            {numericRating.toFixed(1)}
          </span>
          {hasTotalRatings && (
            <span
              className={`${sizeClasses[normalizedSize] || sizeClasses.md} text-gray-500`}
            >
              ({numericTotalRatings})
            </span>
          )}
        </div>
      )}

      {showVerified && isVerified && (
        <div className="flex items-center gap-1 text-blue-600">
          <CheckCircle
            className={`${iconSizes[normalizedSize] || iconSizes.md}`}
          />
          <span className={`${sizeClasses[normalizedSize] || sizeClasses.md}`}>
            Verified
          </span>
        </div>
      )}
    </div>
  );
}
