const { v4: uuidv4 } = require('uuid');

// Generate UUID
const generateId = () => uuidv4();

const toFiniteNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const roundDistance = (value) => {
  const number = toFiniteNumberOrNull(value);
  return number === null ? null : Number(number.toFixed(1));
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const startLat = toFiniteNumberOrNull(lat1);
  const startLng = toFiniteNumberOrNull(lon1);
  const endLat = toFiniteNumberOrNull(lat2);
  const endLng = toFiniteNumberOrNull(lon2);

  if ([startLat, startLng, endLat, endLng].some((value) => value === null)) {
    return null;
  }

  const R = 6371; // Earth's radius in km
  const dLat = toRad(endLat - startLat);
  const dLon = toRad(endLng - startLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(startLat)) *
      Math.cos(toRad(endLat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  return R * c;
};

const toRad = (value) => (value * Math.PI) / 180;

// Format time ago
const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1)
    return (
      Math.floor(interval) +
      ' year' +
      (Math.floor(interval) > 1 ? 's' : '') +
      ' ago'
    );

  interval = seconds / 2592000;
  if (interval > 1)
    return (
      Math.floor(interval) +
      ' month' +
      (Math.floor(interval) > 1 ? 's' : '') +
      ' ago'
    );

  interval = seconds / 86400;
  if (interval > 1)
    return (
      Math.floor(interval) +
      ' day' +
      (Math.floor(interval) > 1 ? 's' : '') +
      ' ago'
    );

  interval = seconds / 3600;
  if (interval > 1)
    return (
      Math.floor(interval) +
      ' hour' +
      (Math.floor(interval) > 1 ? 's' : '') +
      ' ago'
    );

  interval = seconds / 60;
  if (interval > 1)
    return (
      Math.floor(interval) +
      ' minute' +
      (Math.floor(interval) > 1 ? 's' : '') +
      ' ago'
    );

  return (
    Math.floor(seconds) +
    ' second' +
    (Math.floor(seconds) > 1 ? 's' : '') +
    ' ago'
  );
};

// Calculate user badges based on their activity
const calculateUserBadges = (userData) => {
  const badges = [];

  const completedTrades = Number(
    userData?.completedTrades ?? userData?.completed_trades ?? 0
  );
  const rating = Number(userData?.rating ?? 0);
  const totalRatings = Number(
    userData?.totalRatings ?? userData?.total_ratings ?? 0
  );
  const createdAt = userData?.created_at || userData?.createdAt || null;

  // Trusted Trader - 10+ completed trades with 4.5+ rating
  if (completedTrades >= 10 && rating >= 4.5 && totalRatings >= 5) {
    badges.push({
      id: 'trusted-trader',
      name: 'Trusted Trader',
      icon: '⭐',
      color: 'gold',
    });
  }

  // Top Rated - 4.8+ rating with 10+ reviews
  if (rating >= 4.8 && totalRatings >= 10) {
    badges.push({
      id: 'top-rated',
      name: 'Top Rated',
      icon: '🏆',
      color: 'purple',
    });
  }

  // Early Adopter - member for 6+ months
  if (createdAt) {
    const accountAge =
      (new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24 * 30);
    if (accountAge >= 6) {
      badges.push({
        id: 'early-adopter',
        name: 'Early Adopter',
        icon: '🌟',
        color: 'blue',
      });
    }
  }

  // Active Trader - 5+ completed trades
  if (completedTrades >= 5) {
    badges.push({
      id: 'active-trader',
      name: 'Active Trader',
      icon: '🔥',
      color: 'orange',
    });
  }

  // Verified - has verified phone and email
  if (userData.phone_verified && userData.email_verified) {
    badges.push({
      id: 'verified',
      name: 'Verified',
      icon: '✓',
      color: 'green',
    });
  }

  return badges;
};

module.exports = {
  generateId,
  calculateDistance,
  toFiniteNumberOrNull,
  roundDistance,
  timeAgo,
  calculateUserBadges,
};
