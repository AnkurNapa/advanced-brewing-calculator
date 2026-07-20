'use client';

import { DataTable } from '@/components/ui';
import { cn } from '@/components/ui/cn';
import type { UnitSystem } from '@/lib/data/types';
import type { CompareResult, CompareRow, CompareStatus } from '@/lib/compare/compareEngine';

/** Base-unit ids whose display value depends on the metric/US toggle. */
const FAHRENHEIT_BASE_UNIT_ID = 19;
const BARRELS_BASE_UNIT_ID = 6;
const BARRELS_PER_HL = 1.17348; // 1 US barrel = 1.17348 hectolitres

interface Display {
  value: number | null;
  unit: string;
}

/**
 * Render a value in the active unit system. Temperature and volume are the
 * only system-dependent families here; percent/ppm/SRM/cells are unit-neutral
 * and pass through unchanged.
 */
function toDisplay(
  value: number | null,
  unitName: string | null,
  baseUnitId: number | null,
  system: UnitSystem,
): Display {
  const fallbackUnit = unitName ?? '';
  if (value == null) return { value: null, unit: fallbackUnit };

  if (baseUnitId === FAHRENHEIT_BASE_UNIT_ID) {
    return system === 'metric'
      ? { value: (value - 32) / 1.8, unit: '°C' }
      : { value, unit: '°F' };
  }
  if (baseUnitId === BARRELS_BASE_UNIT_ID) {
    return system === 'metric'
      ? { value: value * BARRELS_PER_HL, unit: 'hL' }
      : { value, unit: 'bbl' };
  }
  return { value, unit: fallbackUnit };
}

function formatNumber(value: number | null): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  const decimals = abs !== 0 && abs < 1 ? 3 : abs < 100 ? 2 : 1;
  return value.toFixed(decimals);
}

const STATUS_STYLE: Record<CompareStatus, { badge: string; label: string }> = {
  match: { badge: 'bg-success/15 text-success', label: 'Within tolerance' },
  high: { badge: 'bg-danger/15 text-danger', label: 'Above spec' },
  low: { badge: 'bg-warn/15 text-warn', label: 'Below spec' },
  incomparable: { badge: 'bg-amber-100 text-amber-700', label: 'Not comparable' },
};

function StatusBadge({ status }: { status: CompareStatus }) {
  const { badge, label } = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        badge,
      )}
    >
      {label}
    </span>
  );
}

function DeltaCell({ row, system }: { row: CompareRow; system: UnitSystem }) {
  if (row.delta == null || !row.comparable) {
    return <span className="text-amber-700">—</span>;
  }
  // Delta lives in base units; render it in the formula side's display family.
  const shown = toDisplay(row.delta, row.formulaUnitName, row.formulaBaseUnitId, system);
  const sign = row.delta > 0 ? '+' : '';
  const tone = row.withinTolerance
    ? 'text-success'
    : row.status === 'high'
      ? 'text-danger'
      : 'text-warn';
  return (
    <span className={cn('font-semibold', tone)}>
      {sign}
      {formatNumber(shown.value)}
    </span>
  );
}

interface CompareTableProps {
  result: CompareResult;
  unitSystem: UnitSystem;
}

/** Formula-side vs spec-side diff table with delta highlighting. */
export function CompareTable({ result, unitSystem }: CompareTableProps) {
  return (
    <DataTable
      caption={`${result.matchedCount} of ${result.totalRules} mapping rules resolved · ${result.withinToleranceCount} within tolerance`}
    >
      <thead>
        <tr>
          <th scope="col">Parameter</th>
          <th scope="col" className="text-right">Formula</th>
          <th scope="col" className="text-right">Spec (target)</th>
          <th scope="col" className="text-right">Spec band</th>
          <th scope="col" className="text-right">Δ (base)</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        {result.rows.map((row) => {
          const f = toDisplay(row.formulaValue, row.formulaUnitName, row.formulaBaseUnitId, unitSystem);
          const s = toDisplay(row.specValue, row.specUnitName, row.specBaseUnitId, unitSystem);
          const lo = toDisplay(row.specLow, row.specUnitName, row.specBaseUnitId, unitSystem);
          const hi = toDisplay(row.specHigh, row.specUnitName, row.specBaseUnitId, unitSystem);
          const rowKey = `${row.sortfield}-${row.formulaProcessId}-${row.formulaMaterialId}-${row.specAnalysisId}`;
          return (
            <tr key={rowKey}>
              <th scope="row" className="!whitespace-normal !bg-transparent !normal-case !tracking-normal !text-ink !font-medium">
                {row.label}
                {!row.comparable ? (
                  <span className="ml-2 text-[11px] font-normal text-amber-600">
                    ({row.formulaUnitName ?? '?'} vs {row.specUnitName ?? '?'})
                  </span>
                ) : null}
              </th>
              <td className="text-right">
                {formatNumber(f.value)}
                <span className="ml-1 text-xs text-amber-600">{f.unit}</span>
              </td>
              <td className="text-right">
                {formatNumber(s.value)}
                <span className="ml-1 text-xs text-amber-600">{s.unit}</span>
              </td>
              <td className="text-right text-amber-700">
                {lo.value != null && hi.value != null
                  ? `${formatNumber(lo.value)}–${formatNumber(hi.value)}`
                  : '—'}
              </td>
              <td className="text-right">
                <DeltaCell row={row} system={unitSystem} />
              </td>
              <td>
                <StatusBadge status={row.status} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}
