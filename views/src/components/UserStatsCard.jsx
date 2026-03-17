import { Star, Package, List, Heart } from 'lucide-react';

export function UserStatsCard({ stats, layout = 'grid' }) {
  const rating = Number(stats?.rating);
  const totalRatings = Number(stats?.totalRatings);
  const completedTrades = Number(stats?.completedTrades || 0);
  const activeListings = Number(stats?.activeListings || 0);
  const savedFavorites =
    stats?.savedFavorites === undefined
      ? undefined
      : Number(stats.savedFavorites);

  const statItems = [
    {
      icon: <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />,
      value: Number.isFinite(rating) ? rating.toFixed(1) : '0.0',
      label: `Rating (${Number.isFinite(totalRatings) ? totalRatings : 0})`,
      color: 'text-yellow-600',
    },
    {
      icon: <Package className="w-5 h-5 text-green-500" />,
      value: completedTrades,
      label: 'Trades',
      color: 'text-green-600',
    },
    {
      icon: <List className="w-5 h-5 text-blue-500" />,
      value: activeListings,
      label: 'Active',
      color: 'text-blue-600',
    },
  ];

  if (savedFavorites !== undefined) {
    statItems.push({
      icon: <Heart className="w-5 h-5 text-red-500 fill-red-500" />,
      value: Number.isFinite(savedFavorites) ? savedFavorites : 0,
      label: 'Saved',
      color: 'text-red-600',
    });
  }

  if (layout === 'row') {
    return (
      <div className="flex items-center justify-around gap-4 py-2">
        {statItems.map((stat, index) => (
          <div key={index} className="flex items-center gap-2">
            {stat.icon}
            <div className="flex flex-col">
              <span className="text-lg font-semibold">{stat.value}</span>
              <span className="text-xs text-gray-600">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
      {statItems.map((stat, index) => (
        <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-2">
            {stat.icon}
          </div>
          <div className={`text-2xl font-bold ${stat.color} mb-1`}>
            {stat.value}
          </div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
