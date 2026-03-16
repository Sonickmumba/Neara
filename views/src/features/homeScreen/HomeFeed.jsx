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
          if (notification.type === 'message') {
            navigate('chat-conversation', {
              selectedChatId: notification.referenceId,
            });
          } else if (notification.type === 'trade') {
            navigate('trade-management', {
              selectedTradeId: notification.referenceId,
            });
          } else if (notification.type === 'listing') {
            navigate(`listing-details/${notification.referenceId}`);
          }
        }}
      />
    </div>
  );
}
