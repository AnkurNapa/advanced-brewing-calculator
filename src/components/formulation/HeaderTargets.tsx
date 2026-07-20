'use client';

import type { Formula, UnitSystem } from '@/lib/data/types';
import { srmToEbc, ALx, REx, SGBeer, abv } from '@/lib/engine';
import { fmt } from './format';

interface HeaderTargetsProps {
  formula: Formula;
  unitSystem: UnitSystem;
  degraded: string[];
}

/** ABV% from fermenter OG (°P) + beer RDF, via the spec engine. */
function computeAbv(ogPlato: number | null | undefined, rdf: number | null | undefined): number | null {
  if (!ogPlato || ogPlato <= 0 || !rdf || rdf <= 0) return null;
  const alc = ALx(ogPlato, 0, rdf, 0);
  const re = REx(ogPlato, 0, rdf, 0);
  const v = abv(alc, SGBeer(re, alc));
  return Number.isFinite(v) ? v : null;
}

interface Tile {
  label: string;
  value: string;
  sub?: string;
  estimated?: boolean;
}

/**
 * Derived-target dashboard. The five numbers a brewer reads first (OG, ABV,
 * bitterness, colour, efficiency) lead as hero tiles; the rest follow as
 * secondary detail so the important figures are never buried.
 */
export function HeaderTargets({ formula, unitSystem, degraded }: HeaderTargetsProps) {
  const srm = formula.SRM ?? formula.SRMest;
  const colour =
    srm == null
      ? '—'
      : unitSystem === 'metric'
        ? `${fmt(srmToEbc(srm), 1)} EBC`
        : `${fmt(srm, 1)} SRM`;
  const abvVal = computeAbv(formula.OG1, formula.bRDF ?? formula.bRDFest);

  const hero: Tile[] = [
    { label: 'Original gravity', value: plato(formula.OG1), sub: 'fermenter collect' },
    { label: 'ABV', value: abvVal == null ? '—' : `${fmt(abvVal, 2)}%`, sub: 'from OG & RDF' },
    { label: 'Bitterness', value: ibu(formula.BU), sub: 'target IBU' },
    { label: 'Colour', value: colour, estimated: formula.SRM == null && formula.SRMest != null },
    { label: 'Efficiency', value: pct(formula.Yieldh), sub: 'brewhouse' },
  ];

  const secondary: Tile[] = [
    { label: 'Fermenter volume', value: bbl(formula.Bbl1) },
    { label: 'Finished OG', value: plato(formula.OG2m) },
    { label: 'Mash RDF', value: pct(formula.wRDF), estimated: true },
    { label: 'Beer RDF', value: pct(formula.bRDF) },
    { label: 'Est. bitterness', value: ibu(formula.BUest), estimated: true },
    { label: 'Est. beer RDF', value: pct(formula.bRDFest), estimated: true },
  ];

  return (
    <section aria-label="Derived targets" className="space-y-3">
      {/* Hero KPIs — the numbers a brewer checks first */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {hero.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-parchment px-4 py-3 shadow-sm"
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              {m.label}
              {m.estimated ? <span className="ml-1 font-normal text-amber-400">est</span> : null}
            </dt>
            <dd className="mt-1 font-display text-2xl font-bold leading-none tabular-nums text-amber-900">
              {m.value}
            </dd>
            {m.sub ? <dd className="mt-1 text-[11px] text-amber-600">{m.sub}</dd> : null}
          </div>
        ))}
      </dl>

      {/* Secondary detail */}
      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {secondary.map((m) => (
          <div key={m.label} className="rounded-lg border border-amber-100 bg-parchment px-3 py-1.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
              {m.label}
              {m.estimated ? <span className="ml-1 font-normal text-amber-400">est</span> : null}
            </dt>
            <dd className="font-display text-sm font-bold tabular-nums text-amber-900">{m.value}</dd>
          </div>
        ))}
      </dl>

      {degraded.length > 0 ? (
        <details className="rounded-lg border border-amber-200 bg-parchment px-3 py-2 text-xs text-amber-700">
          <summary className="cursor-pointer font-semibold text-amber-800">
            {degraded.length} field{degraded.length > 1 ? 's' : ''} estimated or using a default
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {degraded.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function pct(v: number | null | undefined): string {
  return v == null ? '—' : `${fmt(v, 1)}%`;
}
function plato(v: number | null | undefined): string {
  return v == null || v === 0 ? '—' : `${fmt(v, 2)} °P`;
}
function bbl(v: number | null | undefined): string {
  return v == null || v === 0 ? '—' : `${fmt(v, 1)} bbl`;
}
function ibu(v: number | null | undefined): string {
  return v == null ? '—' : `${fmt(v, 0)} IBU`;
}
