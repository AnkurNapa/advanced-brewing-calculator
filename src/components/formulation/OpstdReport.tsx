'use client';

import { useMemo } from 'react';
import type { Formula, FormulaDetail, UnitSystem } from '@/lib/data/types';
import { getSeed } from '@/lib/data/seedLoader';
import type { Catalog } from '@/hooks/useCatalog';
import { Button } from '@/components/ui';
import { fmt, formulaLabel, shortDate, reportedText } from './format';

interface OpstdReportProps {
  formula: Formula;
  lines: FormulaDetail[];
  catalog: Catalog;
  unitSystem: UnitSystem;
  onClose?: () => void;
}

/** EdateID -> short date label, from the read-only seed. */
function useDateLabels(): Map<number, string> {
  return useMemo(() => {
    const map = new Map<number, string>();
    for (const d of getSeed().dates) {
      const label = shortDate(d.Edate);
      if (label) map.set(d.EdateID, label);
    }
    return map;
  }, []);
}

/**
 * The printable Operating Standard (OPSTD): recipe header + derived targets,
 * then parameter lines grouped by process step in process order. `@media print`
 * hides the app chrome so `window.print()` yields a clean one-page standard.
 */
export function OpstdReport({
  formula,
  lines,
  catalog,
  unitSystem,
  onClose,
}: OpstdReportProps) {
  const dateLabels = useDateLabels();
  const plant = catalog.plantById.get(formula.PlantID);
  const product = catalog.productById.get(formula.ProductID);
  const title = formulaLabel(formula, plant, product, dateLabels.get(formula.EdateID) ?? null);

  // Group lines by process, ordered by ProcessOrder.
  const groups = useMemo(() => {
    const byProcess = new Map<number, FormulaDetail[]>();
    for (const line of lines) {
      const list = byProcess.get(line.ProcessID) ?? [];
      list.push(line);
      byProcess.set(line.ProcessID, list);
    }
    return [...byProcess.entries()]
      .map(([processId, rows]) => ({
        processId,
        process: catalog.processById.get(processId),
        rows,
      }))
      .sort(
        (a, b) => (a.process?.ProcessOrder ?? 0) - (b.process?.ProcessOrder ?? 0),
      );
  }, [lines, catalog]);

  const srmLabel =
    formula.SRM != null
      ? `${fmt(formula.SRM, 1)} SRM`
      : formula.SRMest != null
        ? `${fmt(formula.SRMest, 1)} SRM (est)`
        : '—';

  const targets: Array<[string, string]> = [
    ['Brewhouse efficiency', formula.Yieldh != null ? `${fmt(formula.Yieldh, 1)} %` : '—'],
    ['Fermenter OG', formula.OG1 != null ? `${fmt(formula.OG1, 2)} °P` : '—'],
    ['Fermenter volume', formula.Bbl1 != null ? `${fmt(formula.Bbl1, 1)} bbl` : '—'],
    ['Colour', srmLabel],
    ['Bitterness', formula.BU != null ? `${fmt(formula.BU, 0)} IBU` : '—'],
    ['Mash RDF', formula.wRDF != null ? `${fmt(formula.wRDF, 1)} %` : '—'],
    ['Beer RDF', formula.bRDF != null ? `${fmt(formula.bRDF, 1)} %` : '—'],
  ];

  return (
    <div className="opstd-report rounded-xl border border-amber-200 bg-parchment">
      <div className="flex items-center justify-between border-b border-amber-200 px-5 py-3 print:hidden">
        <p className="text-sm font-semibold text-amber-900">Operating Standard preview</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
          {onClose && (
            <Button size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="px-6 py-5 print:px-0">
        <header className="mb-4">
          <h2 className="font-display text-2xl font-bold text-amber-900">{title}</h2>
          <p className="mt-1 text-sm text-amber-700">
            Operating Standard · {unitSystem === 'metric' ? 'Metric' : 'US'} display
          </p>
        </header>

        <dl className="mb-6 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
          {targets.map(([label, value]) => (
            <div key={label} className="border-b border-amber-100 pb-1">
              <dt className="text-xs uppercase tracking-wide text-amber-700">{label}</dt>
              <dd className="font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {groups.map(({ processId, process, rows }) => (
          <section key={processId} className="mb-4 break-inside-avoid">
            <h3 className="mb-1 border-b border-amber-200 pb-1 text-sm font-semibold text-amber-900">
              {process?.ProcessName ?? `Process ${processId}`}
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {rows.map((line) => {
                  const material = catalog.materialById.get(line.MaterialID);
                  const unit =
                    line.FUnitID == null ? undefined : catalog.unitById.get(line.FUnitID);
                  return (
                    <tr
                      key={`${line.ProcessID}:${line.MaterialID}`}
                      className="border-b border-amber-50"
                    >
                      <td className="py-1 pr-3 text-ink">
                        {material?.MaterialName ?? line.MText ?? `Material ${line.MaterialID}`}
                      </td>
                      <td className="py-1 pr-2 text-right font-medium tabular-nums text-ink">
                        {reportedText(line)}
                      </td>
                      <td className="py-1 text-left text-amber-700">{unit?.UnitName ?? ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}

        <footer className="mt-6 border-t border-amber-200 pt-2 text-xs text-amber-700">
          Advanced Brewing Calculator · rebuild of the Master Brewers Toolbox (J. Hackbarth / MBAA)
        </footer>
      </div>
    </div>
  );
}
