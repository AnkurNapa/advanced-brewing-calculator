import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// next/navigation isn't wired to a real router in jsdom — stub usePathname.
vi.mock('next/navigation', () => ({
  usePathname: () => '/specification',
}));

import SpecificationPage from '@/app/specification/page';

describe('specification page', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the spec calculator heading and a derived panel', () => {
    render(<SpecificationPage />);

    expect(
      screen.getByRole('heading', { name: /spec calculator/i, level: 1 }),
    ).toBeInTheDocument();

    // Two analysis pickers default to OG + RDF.
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(2);

    // Derived panel shows the worked-example ABV (~5.46 % vol) live.
    expect(screen.getByText(/ABV \(20/i)).toBeInTheDocument();
    expect(screen.getByText(/5\.46 % vol/)).toBeInTheDocument();
  });

  it('lists seeded specifications', () => {
    render(<SpecificationPage />);
    expect(screen.getByText(/seeded specifications/i)).toBeInTheDocument();
  });
});
