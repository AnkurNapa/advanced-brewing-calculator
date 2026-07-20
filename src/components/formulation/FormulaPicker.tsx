'use client';

import { useMemo } from 'react';
import type { Catalog } from '@/hooks/useCatalog';
import type { Formula } from '@/lib/data/types';
import { getSeed } from '@/lib/data/seedLoader';
import { Button } from '@/components/ui';
import { cn } from '@/components/ui/cn';
import { formulaLabel, shortDate } from './format';

interface FormulaPickerProps {
  formulas: Formula[];
  catalog: Catalog;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
}

/** Build the EdateID → short date label map from the read-only seed. */
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

/** Left rail: pick an existing recipe (Plant · Product · Date) or start a new one. */
export function FormulaPicker({
  formulas,
  catalog,
  selectedId,
  onSelect,
  onNew,
}: FormulaPickerProps) {
  const dateLabels = useDateLabels();

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-amber-900">
          Recipes
          <span className="ml-2 text-xs font-normal text-amber-600">{formulas.length}</span>
        </h2>
        <Button size="sm" onClick={onNew}>
          + New
        </Button>
      </div>

      <ul
        aria-label="Formula list"
        className="-mx-1 max-h-[28rem] space-y-1 overflow-y-auto px-1 lg:max-h-[calc(100vh-16rem)]"
      >
        {formulas.map((formula) => {
          const plant = catalog.plantById.get(formula.PlantID);
          const product = catalog.productById.get(formula.ProductID);
          const date = dateLabels.get(formula.EdateID) ?? null;
          const active = formula.FormulaID === selectedId;
          return (
            <li key={formula.FormulaID}>
              <button
                type="button"
                onClick={() => onSelect(formula.FormulaID)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                  active
                    ? 'border-amber-400 bg-amber-50 text-amber-900'
                    : 'border-transparent text-amber-800 hover:border-amber-200 hover:bg-amber-50/60',
                )}
              >
                <span className="block font-medium leading-snug">
                  {product?.ProductName ?? `Product ${formula.ProductID}`}
                </span>
                <span className="mt-0.5 block text-xs text-amber-600">
                  {[plant?.Plantname ?? `Plant ${formula.PlantID}`, date].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Exposed for the report header so both surfaces label a formula identically. */
export function labelForFormula(formula: Formula, catalog: Catalog): string {
  const map = new Map<number, string>();
  for (const d of getSeed().dates) {
    const label = shortDate(d.Edate);
    if (label) map.set(d.EdateID, label);
  }
  return formulaLabel(
    formula,
    catalog.plantById.get(formula.PlantID),
    catalog.productById.get(formula.ProductID),
    map.get(formula.EdateID) ?? null,
  );
}
