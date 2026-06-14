import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomNav } from './BottomNav';

const renderBottomNav = (pathname) => {
  const navigate = vi.fn();
  render(<BottomNav navigate={navigate} pathname={pathname} />);
  return { navigate };
};

const expectActive = (label) => {
  const button = screen.getByRole('button', { name: label });
  expect(button).toHaveAttribute('aria-current', 'page');
  expect(button).toHaveClass('text-blue-600');
};

const expectInactive = (label) => {
  const button = screen.getByRole('button', { name: label });
  expect(button).not.toHaveAttribute('aria-current');
  expect(button).toHaveClass('text-gray-400');
};

describe('BottomNav active route state', () => {
  it('marks Home active only on the home feed index route', () => {
    renderBottomNav('/homeFeed');

    expectActive('Home');
    expectInactive('Search');
    expectInactive('Chats');
    expectInactive('Profile');
  });

  it('marks Search active on search routes', () => {
    renderBottomNav('/homeFeed/search');

    expectInactive('Home');
    expectActive('Search');
    expectInactive('Chats');
    expectInactive('Profile');
  });

  it('marks Chats active on the chat list route', () => {
    renderBottomNav('/homeFeed/chat-list');

    expectInactive('Home');
    expectInactive('Search');
    expectActive('Chats');
    expectInactive('Profile');
  });

  it('marks Profile active on profile and settings routes', () => {
    renderBottomNav('/homeFeed/settings');

    expectInactive('Home');
    expectInactive('Search');
    expectInactive('Chats');
    expectActive('Profile');
  });
});
