/**
 * HelpSupportPanel — unit tests
 *
 * Covers:
 *   - Renders the "Help & Support" heading
 *   - Renders at least one FAQ question
 *   - Clicking a FAQ question expands its answer
 *   - Clicking the same FAQ question again collapses it
 *   - Renders the contact email link
 *   - Renders Terms of Service and Privacy Policy buttons
 *   - Back button calls onBack prop
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HelpSupportPanel } from './HelpSupportPanel';

const onBack = vi.fn();

function renderPanel() {
  return render(<HelpSupportPanel onBack={onBack} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Render ────────────────────────────────────────────────────────────────────

describe('HelpSupportPanel — render', () => {
  it('renders the Help & Support heading', () => {
    renderPanel();
    expect(screen.getByText(/help.*support/i)).toBeInTheDocument();
  });

  it('renders the FAQ section heading', () => {
    renderPanel();
    expect(screen.getByText(/frequently asked questions/i)).toBeInTheDocument();
  });

  it('renders at least one FAQ question', () => {
    renderPanel();
    expect(screen.getByText(/how do i list an item/i)).toBeInTheDocument();
  });

  it('renders the Contact section with email link', () => {
    renderPanel();
    const link = screen.getByRole('link', { name: /email support/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'mailto:support@neara.app');
  });

  it('renders the Terms of Service button', () => {
    renderPanel();
    expect(
      screen.getByRole('button', { name: /terms of service/i })
    ).toBeInTheDocument();
  });

  it('renders the Privacy Policy button', () => {
    renderPanel();
    expect(
      screen.getByRole('button', { name: /privacy policy/i })
    ).toBeInTheDocument();
  });
});

// ── Back button ───────────────────────────────────────────────────────────────

describe('HelpSupportPanel — back button', () => {
  it('calls onBack when the back button is clicked', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

// ── FAQ accordion ─────────────────────────────────────────────────────────────

describe('HelpSupportPanel — FAQ accordion', () => {
  it('FAQ answer is not visible before clicking', () => {
    renderPanel();
    expect(screen.queryByText(/tap the.*\+ button/i)).not.toBeInTheDocument();
  });

  it('expands a FAQ answer when the question is clicked', () => {
    renderPanel();
    fireEvent.click(screen.getByText(/how do i list an item/i));
    expect(screen.getByText(/tap the/i)).toBeInTheDocument();
  });

  it('collapses a FAQ answer when the question is clicked again', () => {
    renderPanel();
    const questionBtn = screen.getByText(/how do i list an item/i);
    fireEvent.click(questionBtn);
    fireEvent.click(questionBtn);
    expect(screen.queryByText(/tap the/i)).not.toBeInTheDocument();
  });

  it('can expand multiple FAQ items independently', () => {
    renderPanel();
    fireEvent.click(screen.getByText(/how do i list an item/i));
    fireEvent.click(screen.getByText(/how does the trade process work/i));

    expect(screen.getByText(/tap the/i)).toBeInTheDocument();
    expect(screen.getByText(/browse items/i)).toBeInTheDocument();
  });
});
