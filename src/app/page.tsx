import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card } from '@/components/ui';

interface ModuleDef {
  href: string;
  title: string;
  description: string;
  meta: string;
  icon: ReactNode;
  /** Feature the module across two columns on wide screens. */
  featured?: boolean;
}

const iconStroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const MODULES: ModuleDef[] = [
  {
    href: '/formulation',
    title: 'Formulation',
    description:
      'Build a recipe from plant, product and brew date. Enter parameter lines by process step, then calculate forward or backward to derive OG, color, IBU, RDF and brewhouse efficiency — with a printable OPSTD.',
    meta: 'Recipe → OPSTD engine',
    featured: true,
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...iconStroke}>
        <path d="M9 3h6M10 3v5.5L5.2 17a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3L14 8.5V3" />
        <path d="M7.5 14h9" />
      </svg>
    ),
  },
  {
    href: '/specification',
    title: 'Specification',
    description:
      'Enter any two analyses and derive the rest: RDF, real/apparent extract, ABV, calories, ash, protein, carbohydrate and color (SRM ⇄ EBC).',
    meta: 'Ch.4 derivation engine',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...iconStroke}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    href: '/compare',
    title: 'Compare',
    description:
      'Diff a formula against its specification across 13 mapping rules to see where the recipe drifts from the target standard.',
    meta: '13 CompareFormSpec rules',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" {...iconStroke}>
        <path d="M12 3v18" />
        <path d="M7 7 3 12l4 5M17 7l4 5-4 5" />
      </svg>
    ),
  },
];

const SUPPORT_TABLES: Array<{ href: string; label: string; note: string }> = [
  { href: '/materials', label: 'Materials', note: 'Malts, hops, adjuncts' },
  { href: '/plants', label: 'Plants', note: 'Brewhouse geometry' },
  { href: '/products', label: 'Products', note: 'Finished beer specs' },
  { href: '/units', label: 'Units', note: 'Base-unit conversions' },
];

function ModuleCard({ module }: { module: ModuleDef }) {
  return (
    <Card
      as="article"
      interactive
      className={module.featured ? 'sm:col-span-2 lg:col-span-2' : ''}
    >
      <Link
        href={module.href}
        className="group flex h-full flex-col gap-4 rounded-xl p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-amber-50 text-amber-900">
            {module.icon}
          </span>
          <span className="rounded-full border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-600">
            {module.meta}
          </span>
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-amber-900">
            {module.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-amber-800">
            {module.description}
          </p>
        </div>
        <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-teal-700 group-hover:gap-2">
          Open {module.title}
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>
    </Card>
  );
}

export default function Home() {
  return (
    <AppShell>
      {/* Hero */}
      <section aria-labelledby="landing-heading" className="max-w-3xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
          Master Brewers Toolbox · rebuilt
        </p>
        <h1
          id="landing-heading"
          className="font-display text-4xl font-bold leading-tight text-amber-900 sm:text-5xl"
        >
          The pro-tier brewing
          <br className="hidden sm:block" /> formulation engine
        </h1>
        <p className="mt-4 text-base leading-relaxed text-amber-800">
          Formulate recipes, derive full specifications, and compare the two —
          all in the browser, computed from base units so the numbers hold at
          any scale. Seeded with real Master Brewers recipes so you can explore
          a working brew on the first click.
        </p>
      </section>

      {/* Module bento */}
      <section aria-label="Modules" className="mt-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((module) => (
            <ModuleCard key={module.href} module={module} />
          ))}
        </div>
      </section>

      {/* Support tables */}
      <section aria-labelledby="support-heading" className="mt-12">
        <h2
          id="support-heading"
          className="font-display text-sm font-semibold uppercase tracking-widest text-amber-600"
        >
          Reference tables
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SUPPORT_TABLES.map((table) => (
            <Card key={table.href} interactive>
              <Link
                href={table.href}
                className="flex h-full flex-col gap-0.5 rounded-xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span className="text-sm font-semibold text-amber-900">
                  {table.label}
                </span>
                <span className="text-xs text-amber-700">{table.note}</span>
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
