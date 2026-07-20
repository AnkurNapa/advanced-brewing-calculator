'use client';

import { useMemo, useState } from 'react';
import { Card, DataTable } from '@/components/ui';
import { getSeed } from '@/lib/data/seedLoader';
import type { SFormulaDetail } from '@/lib/data/types';

function dateLabel(raw: string | null | undefined): string {
  if (!raw) return '—';
  // Seed dates look like "4/8/2003 12:00:00 AM" — keep the date portion.
  return raw.split(' ')[0] ?? raw;
}

/** Read-only browser of the seeded specification formulas and their lines. */
export function SpecList() {
  const seed = getSeed();
  const [openId, setOpenId] = useState<number | null>(null);

  const lookups = useMemo(() => {
    const plants = new Map(seed.plants.map((p) => [p.PlantID, p.Plantname]));
    const products = new Map(seed.products.map((p) => [p.ProductID, p.ProductName]));
    const dates = new Map(seed.dates.map((d) => [d.EdateID, d.Edate]));
    const materials = new Map(seed.sMaterials.map((m) => [m.MaterialID, m.MaterialName]));
    const processes = new Map(seed.process.map((p) => [p.ProcessID, p.ProcessName]));
    const processOrder = new Map(seed.process.map((p) => [p.ProcessID, p.ProcessOrder]));
    return { plants, products, dates, materials, processes, processOrder };
  }, [seed]);

  const formulas = useMemo(
    () =>
      [...seed.sFormula].sort((a, b) => a.formulaID - b.formulaID),
    [seed.sFormula],
  );

  const detailsFor = (formulaID: number): SFormulaDetail[] =>
    seed.sFormulaDetails
      .filter((d) => d.formulaID === formulaID)
      .sort((a, b) => {
        const po =
          (lookups.processOrder.get(a.processID) ?? 0) -
          (lookups.processOrder.get(b.processID) ?? 0);
        return po !== 0 ? po : a.qorder - b.qorder;
      });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-amber-800">
        {formulas.length} seeded specifications from the Master Brewers Toolbox.
        Select one to inspect its analysis lines (target with low/nominal/high
        band).
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {formulas.map((f) => {
          const isOpen = openId === f.formulaID;
          return (
            <Card key={f.formulaID} interactive={!isOpen}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : f.formulaID)}
                className="flex w-full flex-col gap-0.5 rounded-xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span className="text-sm font-semibold text-amber-900">
                  {lookups.products.get(f.productID ?? -1) ?? `Product ${f.productID}`}
                </span>
                <span className="text-xs text-amber-700">
                  {lookups.plants.get(f.plantID ?? -1) ?? `Plant ${f.plantID}`}
                  {' · '}
                  {dateLabel(lookups.dates.get(f.edateID ?? -1))}
                </span>
                <span className="mt-1 text-[11px] uppercase tracking-wide text-teal-700">
                  Spec #{f.formulaID} · {isOpen ? 'hide lines' : 'view lines'}
                </span>
              </button>
            </Card>
          );
        })}
      </div>

      {openId !== null ? (
        <DataTable
          caption={`Analysis lines for specification #${openId}`}
          wrapperClassName="mt-1"
        >
          <thead>
            <tr>
              <th>Process</th>
              <th>Analysis</th>
              <th>Nominal</th>
              <th>±</th>
              <th>Low</th>
              <th>High</th>
            </tr>
          </thead>
          <tbody>
            {detailsFor(openId).map((d, i) => (
              <tr key={`${d.processID}-${d.materialID}-${i}`}>
                <td>{lookups.processes.get(d.processID) ?? d.processID}</td>
                <td>{d.mtext ?? lookups.materials.get(d.materialID) ?? d.materialID}</td>
                <td>{d.CalcV ?? d.InV}</td>
                <td>{d.InV}</td>
                <td>{d.q1}</td>
                <td>{d.q3}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : null}
    </div>
  );
}
