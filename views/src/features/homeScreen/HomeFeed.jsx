import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowDown } from 'lucide-react';

import { fetchHomeFeed } from './homeFeedThunks';
import {
  selectFilteredListings,
  selectFeedStatus,
  selectActiveTab,
} from './homeFeedSelectors';
import { setActiveTab } from './homeFeedSlice';
import { usePullToRefresh, THRESHOLD } from '../../hooks/usePullToRefresh';

import { HomeHeader } from './components/HomeHeader';
import { QuickActions } from './components/QuickActions';
import { Tabs } from './components/Tabs';
import { ListingsFeed } from './components/ListingsFeed';
import { RecentActivity } from '../../components/RecentActivity';
import { NotificationsPanel } from '../../components/NotificationsPanel';
import apiClient from '../../services/api';

export function HomeFeed() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const listings = useSelector(selectFilteredListings);
  const status = useSelector(selectFeedStatus);
  const activeTab = useSelector(selectActiveTab);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgePulseNonce, setBadgePulseNonce] = useState(0);
  const hasUnreadInitializedRef = useRef(false);

  const updateUnreadCount = useCallback((nextCountInput) => {
    const nextCount = Number(nextCountInput || 0);

    setUnreadCount((previousCount) => {
      if (!hasUnreadInitializedRef.current) {
        hasUnreadInitializedRef.current = true;
        return nextCount;
      }

      if (nextCount > previousCount) {
        setBadgePulseNonce((nonce) => nonce + 1);
      }

      return nextCount;
    });
  }, []);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchHomeFeed());
    }
  }, [status, dispatch]);

  // Pull-to-refresh: force a re-fetch regardless of current status
  const handleRefresh = useCallback(
    () => dispatch(fetchHomeFeed()),
    [dispatch]
  );
  const { pullDistance, isRefreshing } = usePullToRefresh(handleRefresh);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/notifications/unread-count');
      updateUnreadCount(res.data?.data?.unreadCount);
    } catch {
      updateUnreadCount(0);
    }
  }, [updateUnreadCount]);

  useEffect(() => {
    fetchUnreadCount();

    const intervalId = window.setInterval(fetchUnreadCount, 30000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchUnreadCount]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <HomeHeader
        navigate={navigate}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        hasUnreadNotifications={unreadCount > 0}
        unreadCount={unreadCount}
        badgePulseNonce={badgePulseNonce}
      />
      <QuickActions
        navigate={navigate}
        showActivity={showActivity}
        setShowActivity={setShowActivity}
      />
      <Tabs
        activeTab={activeTab}
        onTabChange={(tab) => dispatch(setActiveTab(tab))}
      />

      {/* Pull-to-refresh indicator — visible during pull gesture and while refreshing */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          data-testid="pull-refresh-indicator"
          className="flex items-center justify-center py-3 overflow-hidden"
          style={{
            transform: `translateY(${pullDistance > 0 ? Math.round(pullDistance * 0.4) : 0}px)`,
            transition: pullDistance > 0 ? 'none' : 'transform 0.2s ease',
          }}
        >
          {isRefreshing ? (
            <div className="flex items-center gap-2 text-blue-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Refreshing...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <ArrowDown
                className={`w-5 h-5 transition-transform duration-200 ${
                  pullDistance >= THRESHOLD ? 'rotate-180' : ''
                }`}
              />
              <span className="text-sm">
                {pullDistance >= THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </div>
          )}
        </div>
      )}
      {showActivity && (
        <div className="bg-white border-b border-gray-200 p-4">
          <RecentActivity
            onListingClick={(listingId) =>
              navigate(`listing-details/${listingId}`)
            }
          />
        </div>
      )}
      <div className="px-4 py-4 space-y-4">
        <ListingsFeed listings={listings} />
      </div>
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadCountChange={updateUnreadCount}
        onNotificationClick={(notification) => {
          setShowNotifications(false);
          const refId = notification.referenceId || notification.reference_id;

          if (notification.type === 'message') {
            if (!refId) return;
            navigate(`chat-conversation/${refId}`, {
              state: { fromNotification: true },
            });
          } else if (notification.type === 'trade') {
            if (!refId) return;
            navigate(`trade-management/${refId}`);
          } else if (notification.type === 'listing') {
            if (!refId) return;
            navigate(`listing-details/${refId}`);
          }
        }}
      />
    </div>
  );
}
