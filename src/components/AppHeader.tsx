'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UnitSystemToggle } from './UnitSystemToggle';
import { cn } from './ui/cn';

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '/formulation', label: 'Formulation' },
  { href: '/specification', label: 'Specification' },
  { href: '/compare', label: 'Compare' },
];

/** Sticky top bar: wordmark, module nav, and the unit-system toggle. */
export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-amber-200 bg-parchment/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-md bg-teal-700 font-display text-sm font-bold text-parchment"
          >
            AB
          </span>
          <span className="font-display text-base font-bold text-amber-900">
            Advanced Brewing
            <span className="hidden sm:inline"> Calculator</span>
          </span>
        </Link>

        <nav
          aria-label="Modules"
          className="ml-2 hidden items-center gap-1 md:flex"
        >
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || (pathname?.startsWith(`${link.href}/`) ?? false);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                  active
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-amber-800 hover:bg-amber-50 hover:text-amber-900',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <UnitSystemToggle />
        </div>
      </div>
    </header>
  );
}
