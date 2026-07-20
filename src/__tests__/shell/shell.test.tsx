import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// next/navigation isn't wired to a real router in jsdom — stub usePathname.
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

import Home from '@/app/page';
import { UnitSystemProvider } from '@/context/UnitSystemContext';
import { UnitSystemToggle } from '@/components/UnitSystemToggle';

describe('app shell landing', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders links to all three feature modules', () => {
    render(<Home />);

    // Module cards link to the three feature routes (header nav links too).
    expect(
      screen.getAllByRole('link', { name: /formulation/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: /specification/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: /compare/i }).length,
    ).toBeGreaterThan(0);

    // Each module route is present as an href somewhere on the page.
    const hrefs = screen
      .getAllByRole('link')
      .map((el) => el.getAttribute('href'));
    expect(hrefs).toContain('/formulation');
    expect(hrefs).toContain('/specification');
    expect(hrefs).toContain('/compare');
  });

  it('mentions the seeded example recipes', () => {
    render(<Home />);
    expect(screen.getByText(/example recipes/i)).toBeInTheDocument();
  });
});

describe('unit system toggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to metric and switches to US on click', () => {
    render(
      <UnitSystemProvider>
        <UnitSystemToggle />
      </UnitSystemProvider>,
    );

    const group = screen.getByRole('group', { name: /unit system/i });
    const metricBtn = within(group).getByRole('button', { name: 'Metric' });
    const usBtn = within(group).getByRole('button', { name: 'US' });

    // Default is metric.
    expect(metricBtn).toHaveAttribute('aria-pressed', 'true');
    expect(usBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(usBtn);

    expect(usBtn).toHaveAttribute('aria-pressed', 'true');
    expect(metricBtn).toHaveAttribute('aria-pressed', 'false');
    expect(window.localStorage.getItem('abc:unitSystem')).toBe('us');
  });
});
