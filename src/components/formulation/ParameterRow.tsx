'use client';

import type { Catalog } from '@/hooks/useCatalog';
import type { FormulaDetail, UnitSystem } from '@/lib/data/types';
import { Button } from '@/components/ui';
import { classifyLine, type CalcContext } from '@/lib/formulation/formulaCalc';
import { displayQuantity, fmt } from './format';

interface ParameterRowProps {
  line: FormulaDetail;
  catalog: Catalog;
  ctx: CalcContext;
  unitSystem: UnitSystem;
  onChange: (patch: Partial<FormulaDetail>) => void;
  onRemove: () => void;
}

const KIND_BADGE: Record<string, string> = {
  malt: 'bg-amber-100 text-amber-900',
  grits: 'bg-amber-100 text-amber-900',
  syrup: 'bg-orange-100 text-orange-900',
  krausen: 'bg-orange-100 text-orange-900',
  hop: 'bg-teal-100 text-teal-900',
  hopReduced: 'bg-teal-100 text-teal-900',
  passthrough: 'bg-amber-50 text-amber-600',
};

/** One editable subform line: material, formulation value, units, rounding, output. */
export function ParameterRow({
  line,
  catalog,
  ctx,
  unitSystem,
  onChange,
  onRemove,
}: ParameterRowProps) {
  const material = catalog.materialById.get(line.MaterialID);
  const unit = line.FUnitID == null ? undefined : catalog.unitById.get(line.FUnitID);
  const kind = classifyLine(line, ctx);
  const isRaw = kind !== 'passthrough';
  const out = displayQuantity(line.Quantity, unit, unitSystem);

  return (
    <tr>
      <th scope="row" className="!font-normal">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${KIND_BADGE[kind]}`}
          >
            {kind === 'passthrough' ? 'note' : kind}
          </span>
          <span className="text-ink">{material?.MaterialName?.trim() ?? `Material ${line.MaterialID}`}</span>
        </div>
      </th>

      {/* Formulation value (yellow driver) */}
      <td>
        <input
          type="number"
          inputMode="decimal"
          aria-label="Formulation value"
          value={Number.isFinite(line.Fraction) ? line.Fraction : ''}
          onChange={(e) => onChange({ Fraction: e.target.value === '' ? 0 : Number(e.target.value) })}
          className="w-24 rounded-md border border-amber-200 bg-amber-50/40 px-2 py-1 text-right text-sm tabular-nums text-ink focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        />
      </td>

      {/* Formulation units */}
      <td>
        <select
          aria-label="Formulation units"
          value={line.FUnitID ?? ''}
          onChange={(e) => onChange({ FUnitID: e.target.value === '' ? null : Number(e.target.value) })}
          className="max-w-[9rem] rounded-md border border-amber-200 bg-parchment px-2 py-1 text-sm text-ink focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        >
          <option value="">—</option>
          {catalog.units.map((u) => (
            <option key={u.UnitID} value={u.UnitID}>
              {u.UnitName ?? `Unit ${u.UnitID}`}
            </option>
          ))}
        </select>
      </td>

      {/* Rounding increment */}
      <td>
        <input
          type="number"
          inputMode="decimal"
          aria-label="Rounding increment"
          value={Number.isFinite(line.Qround) ? line.Qround : ''}
          onChange={(e) => onChange({ Qround: e.target.value === '' ? 0 : Number(e.target.value) })}
          className="w-16 rounded-md border border-amber-200 bg-parchment px-2 py-1 text-right text-sm tabular-nums text-ink focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        />
      </td>

      {/* Calculated value (output) */}
      <td className="text-right">
        {out.value == null ? (
          <span className="text-amber-500">{isRaw ? '—' : 'note'}</span>
        ) : (
          <span title={out.alt}>
            <span className="font-semibold tabular-nums text-amber-900">{fmt(out.value)}</span>{' '}
            <span className="text-xs text-amber-600">{out.unit}</span>
          </span>
        )}
      </td>

      <td className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Remove ${material?.MaterialName?.trim() ?? 'line'}`}
          className="!px-2 !text-amber-500 hover:!text-red-600"
        >
          ✕
        </Button>
      </td>
    </tr>
  );
}
