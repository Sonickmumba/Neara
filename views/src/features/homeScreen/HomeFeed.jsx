import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { fetchHomeFeed } from './homeFeedThunks';
import {
  selectFilteredListings,
  selectFeedStatus,
  selectActiveTab,
} from './homeFeedSelectors';
import { setActiveTab } from './homeFeedSlice';

import { HomeHeader } from './components/HomeHeader';
import { QuickActions } from './components/QuickActions';
import { Tabs } from './components/Tabs';
import { ListingsFeed } from './components/ListingsFeed';
import { RecentActivity } from '../../components/RecentActivity';
import { NotificationsPanel } from '../../components/NotificationsPanel';

export function HomeFeed() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const listings = useSelector(selectFilteredListings);
  const status = useSelector(selectFeedStatus);
  const activeTab = useSelector(selectActiveTab);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchHomeFeed());
    }
  }, [status, dispatch]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <HomeHeader
        navigate={navigate}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
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
            navigate('trade-management', {
              selectedTradeId: refId,
            });
          } else if (notification.type === 'listing') {
            if (!refId) return;
            navigate(`listing-details/${refId}`);
          }
        }}
      />
    </div>
  );
}
