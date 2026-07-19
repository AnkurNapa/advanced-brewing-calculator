import type { ReactNode } from 'react';
import { UnitSystemProvider } from '@/context/UnitSystemContext';
import { AppHeader } from './AppHeader';
import { cn } from './ui/cn';

interface AppShellProps {
  children: ReactNode;
  /** Extra classes on the <main> content container. */
  mainClassName?: string;
}

/**
 * Page frame shared by every route: unit-system provider, sticky header,
 * a constrained <main>, and the attribution footer. Feature pages render
 * their content as children of this shell.
 */
export function AppShell({ children, mainClassName }: AppShellProps) {
  return (
    <UnitSystemProvider>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main
          className={cn(
            'mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6',
            mainClassName,
          )}
        >
          {children}
        </main>
        <footer className="border-t border-amber-200 bg-parchment">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
            <p className="text-xs text-amber-700">
              Rebuild of the Master Brewers Toolbox (J. Hackbarth / MBAA).
              Engine ported from BrewHelp Ch.3–4; all figures are estimates for
              planning, not a substitute for measured brewhouse data.
            </p>
          </div>
        </footer>
      </div>
    </UnitSystemProvider>
  );
}
