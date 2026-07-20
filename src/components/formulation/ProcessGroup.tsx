'use client';

import { useState } from 'react';
import type { Catalog } from '@/hooks/useCatalog';
import type { FormulaDetail, Process, UnitSystem } from '@/lib/data/types';
import { Button, DataTable } from '@/components/ui';
import type { CalcContext } from '@/lib/formulation/formulaCalc';
import { ParameterRow } from './ParameterRow';

interface ProcessGroupProps {
  process: Process | undefined;
  processId: number;
  lines: FormulaDetail[];
  catalog: Catalog;
  ctx: CalcContext;
  unitSystem: UnitSystem;
  onChangeLine: (line: FormulaDetail, patch: Partial<FormulaDetail>) => void;
  onRemoveLine: (line: FormulaDetail) => void;
  onAddLine: (processId: number, materialId: number) => void;
}

/** A process step heading + its editable parameter lines + an add-line control. */
export function ProcessGroup({
  process,
  processId,
  lines,
  catalog,
  ctx,
  unitSystem,
  onChangeLine,
  onRemoveLine,
  onAddLine,
}: ProcessGroupProps) {
  const [adding, setAdding] = useState(false);
  const [pickId, setPickId] = useState<number | ''>('');

  const usedMaterialIds = new Set(lines.map((l) => l.MaterialID));

  return (
    <section aria-label={process?.ProcessName ?? `Process ${processId}`} className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-amber-900">
          {process?.ProcessName ?? `Process ${processId}`}
          <span className="ml-2 text-xs font-normal text-amber-600">
            {lines.length} line{lines.length === 1 ? '' : 's'}
          </span>
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setAdding((v) => !v)}>
          {adding ? 'Cancel' : '+ Add line'}
        </Button>
      </div>

      {adding ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-3 py-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Material
          </label>
          <select
            value={pickId}
            onChange={(e) => setPickId(e.target.value === '' ? '' : Number(e.target.value))}
            className="min-w-[14rem] rounded-md border border-amber-200 bg-parchment px-2 py-1 text-sm text-ink focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          >
            <option value="">Choose a material…</option>
            {catalog.materials
              .filter((m) => !usedMaterialIds.has(m.MaterialID))
              .map((m) => (
                <option key={m.MaterialID} value={m.MaterialID}>
                  {m.MaterialName.trim()} · {catalog.categoryById.get(m.CategoryID)?.CategoryName ?? '?'}
                </option>
              ))}
          </select>
          <Button
            size="sm"
            disabled={pickId === ''}
            onClick={() => {
              if (pickId === '') return;
              onAddLine(processId, pickId);
              setPickId('');
              setAdding(false);
            }}
          >
            Add
          </Button>
        </div>
      ) : null}

      <DataTable className="[&_td]:!py-1.5 [&_th]:!py-2">
        <thead>
          <tr>
            <th>Ingredient</th>
            <th title="The target you enter that drives the calc — e.g. % of extract for malt, % of IBU for hops.">
              Formulation value
            </th>
            <th>Units</th>
            <th title="Round the calculated amount to this increment (e.g. 25 for a 25&nbsp;lb bag).">
              Round to
            </th>
            <th className="text-right" title="The amount the engine computed for this line.">
              → Amount
            </th>
            <th className="sr-only">Actions</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <ParameterRow
              key={`${line.ProcessID}:${line.MaterialID}:${line.Qorder}`}
              line={line}
              catalog={catalog}
              ctx={ctx}
              unitSystem={unitSystem}
              onChange={(patch) => onChangeLine(line, patch)}
              onRemove={() => onRemoveLine(line)}
            />
          ))}
        </tbody>
      </DataTable>
    </section>
  );
}
