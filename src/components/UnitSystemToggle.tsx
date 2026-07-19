'use client';

import type { UnitSystem } from '@/lib/data/types';
import { useUnitSystem } from '@/context/UnitSystemContext';
import { cn } from './ui/cn';

const OPTIONS: Array<{ value: UnitSystem; label: string; title: string }> = [
  { value: 'metric', label: 'Metric', title: 'Metric units (kg, L, °C)' },
  { value: 'us', label: 'US', title: 'US units (lb, bbl, °F)' },
];

/** Segmented Metric ⇄ US toggle wired to the UnitSystem context. */
export function UnitSystemToggle({ className }: { className?: string }) {
  const { unitSystem, setUnitSystem } = useUnitSystem();

  return (
    <div
      role="group"
      aria-label="Unit system"
      className={cn(
        'inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 p-0.5',
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const active = unitSystem === option.value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            aria-pressed={active}
            onClick={() => setUnitSystem(option.value)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1',
              active
                ? 'bg-parchment text-amber-900 shadow-sm'
                : 'text-amber-700 hover:text-amber-900',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
