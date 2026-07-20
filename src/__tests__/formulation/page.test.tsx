import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

// next/navigation isn't wired to a real router in jsdom — stub usePathname.
vi.mock('next/navigation', () => ({
  usePathname: () => '/formulation',
}));

import FormulationPage from '@/app/formulation/page';

/**
 * Smoke test for the /formulation route: a seeded recipe auto-loads, the calc
 * toolbar is present, and Calculate Forward runs without throwing and keeps the
 * derived-target panel on screen.
 */
describe('FormulationPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('auto-loads a seeded recipe and shows the calc toolbar', () => {
    render(<FormulationPage />);
    expect(
      screen.getByRole('heading', { name: /recipe & operating standard/i }),
    ).toBeInTheDocument();
    const toolbar = screen.getByRole('toolbar', { name: /calculation actions/i });
    expect(within(toolbar).getByRole('button', { name: /calculate forward/i })).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: /calculate backward/i }),
    ).toBeInTheDocument();
  });

  it('runs Calculate Forward without crashing', () => {
    render(<FormulationPage />);
    const toolbar = screen.getByRole('toolbar', { name: /calculation actions/i });
    fireEvent.click(within(toolbar).getByRole('button', { name: /calculate forward/i }));
    // The KPI dashboard is still present after recalculation (ABV + Efficiency
    // are hero tiles that always render).
    expect(screen.getByText('ABV')).toBeInTheDocument();
    expect(screen.getAllByText(/efficiency/i).length).toBeGreaterThan(0);
  });

  it('toggles the OPSTD preview', () => {
    render(<FormulationPage />);
    fireEvent.click(screen.getByRole('button', { name: /opstd/i }));
    expect(screen.getByText(/operating standard preview/i)).toBeInTheDocument();
  });
});
