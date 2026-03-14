import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function HomeFeedLayout() {
  const navigate = useNavigate();

  // placeholder for any shared layout logic (e.g. conditionally show
  // a notifications drawer based on route or screen size)

  return (
    <div className="min-h-screen pb-16">
      <Outlet />
      <BottomNav navigate={navigate} />
    </div>
  );
}
