import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function HomeFeedLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide BottomNav on full-screen flows
  const shouldShowBottomNav =
    !location.pathname.includes('/listing-details/') &&
    !location.pathname.includes('/create-listing') &&
    !location.pathname.includes('/chat-conversation/');

  // placeholder for any shared layout logic (e.g. conditionally show
  // a notifications drawer based on route or screen size)

  return (
    <div className="min-h-screen pb-16">
      <Outlet />
      {shouldShowBottomNav && <BottomNav navigate={navigate} />}
    </div>
  );
}
