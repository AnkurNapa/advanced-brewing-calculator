import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// next/navigation isn't wired to a real router in jsdom — stub usePathname.
vi.mock('next/navigation', () => ({
  usePathname: () => '/compare',
}));

import ComparePage from '@/app/compare/page';

describe('compare page (smoke)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the compare module with both pickers and a comparison table', () => {
    render(<ComparePage />);

    // Heading + module intent.
    expect(
      screen.getByRole('heading', { name: /formula vs specification/i }),
    ).toBeInTheDocument();

    // Two record pickers (Formula + Specification).
    expect(screen.getByLabelText(/^formula$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/specification/i)).toBeInTheDocument();

    // The comparison table caption reports how many rules resolved.
    expect(screen.getByText(/mapping rules resolved/i)).toBeInTheDocument();

    // Summary strip surfaces the within-tolerance count (label also appears on
    // matching status badges, so there is at least one match).
    expect(screen.getAllByText(/within tolerance/i).length).toBeGreaterThan(0);

    // Rules-resolved copy renders (summary stat label + table caption).
    expect(screen.getAllByText(/rules resolved/i).length).toBeGreaterThan(0);
  });
});
