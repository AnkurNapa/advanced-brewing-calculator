'use client';

import type { Formula } from '@/lib/data/types';
import { srmToEbc } from '@/lib/engine';
import { fmt } from './format';
import type { UnitSystem } from '@/lib/data/types';

interface HeaderTargetsProps {
  formula: Formula;
  unitSystem: UnitSystem;
  degraded: string[];
}

interface Metric {
  label: string;
  value: string;
  hint?: string;
  estimated?: boolean;
}

/** The derived target panel: efficiency, gravities, colour, bitterness, RDF. */
export function HeaderTargets({ formula, unitSystem, degraded }: HeaderTargetsProps) {
  const srm = formula.SRM ?? formula.SRMest;
  const colour =
    srm == null
      ? '—'
      : unitSystem === 'metric'
        ? `${fmt(srmToEbc(srm), 1)} EBC`
        : `${fmt(srm, 1)} SRM`;

  const metrics: Metric[] = [
    { label: 'Brewhouse efficiency', value: pct(formula.Yieldh), hint: '% extract recovered' },
    { label: 'Fermenter OG', value: plato(formula.OG1) },
    { label: 'Fermenter volume', value: bbl(formula.Bbl1) },
    { label: 'Finished OG', value: plato(formula.OG2m) },
    { label: 'Colour', value: colour, estimated: formula.SRM == null && formula.SRMest != null },
    { label: 'Bitterness', value: ibu(formula.BU) },
    { label: 'Est. bitterness', value: ibu(formula.BUest), estimated: true },
    { label: 'Mash RDF', value: pct(formula.wRDF), estimated: true },
    { label: 'Beer RDF', value: pct(formula.bRDF) },
    { label: 'Est. beer RDF', value: pct(formula.bRDFest), estimated: true },
  ];

  return (
    <section aria-label="Header targets" className="space-y-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2"
          >
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              {m.label}
              {m.estimated ? <span className="ml-1 text-amber-400">est</span> : null}
            </dt>
            <dd className="mt-0.5 font-display text-lg font-bold tabular-nums text-amber-900">
              {m.value}
            </dd>
            {m.hint ? <dd className="text-[11px] text-amber-600">{m.hint}</dd> : null}
          </div>
        ))}
      </dl>

      {degraded.length > 0 ? (
        <details className="rounded-lg border border-amber-200 bg-parchment px-3 py-2 text-xs text-amber-700">
          <summary className="cursor-pointer font-semibold text-amber-800">
            {degraded.length} field{degraded.length > 1 ? 's' : ''} estimated or degraded
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
  return v == null ? '—' : `${fmt(v, 1)} IBU`;
}
