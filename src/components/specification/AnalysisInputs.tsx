'use client';

import { useId } from 'react';
import { NumberField, cn } from '@/components/ui';
import {
  ANALYSIS_META,
  isRedundantPair,
  type AnalysisKey,
} from '@/lib/specification/specDerive';

const ANALYSIS_ORDER: AnalysisKey[] = ['OG', 'RDF', 'RE', 'ALC', 'AE', 'SG', 'ABV'];

export interface AnalysisSlot {
  key: AnalysisKey;
  value: number | '';
  tolerance: number | '';
}

interface AnalysisInputsProps {
  slots: [AnalysisSlot, AnalysisSlot];
  showTolerance: boolean;
  onKeyChange: (index: 0 | 1, key: AnalysisKey) => void;
  onValueChange: (index: 0 | 1, value: number | '') => void;
  onToleranceChange: (index: 0 | 1, value: number | '') => void;
  onToggleTolerance: (next: boolean) => void;
}

/**
 * Two analysis pickers with a value (and optional ± tolerance) each.
 * Guards against selecting the same or a redundant (SG+AE) pair.
 */
export function AnalysisInputs({
  slots,
  showTolerance,
  onKeyChange,
  onValueChange,
  onToleranceChange,
  onToggleTolerance,
}: AnalysisInputsProps) {
  const toleranceOnlyForOgRdf =
    !(slots[0].key === 'OG' || slots[0].key === 'RDF') ||
    !(slots[1].key === 'OG' || slots[1].key === 'RDF');

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {slots.map((slot, index) => (
          <AnalysisSlotField
            key={index}
            slot={slot}
            otherKey={slots[index === 0 ? 1 : 0].key}
            showTolerance={showTolerance}
            onKeyChange={(key) => onKeyChange(index as 0 | 1, key)}
            onValueChange={(value) => onValueChange(index as 0 | 1, value)}
            onToleranceChange={(value) => onToleranceChange(index as 0 | 1, value)}
          />
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-amber-800">
        <input
          type="checkbox"
          checked={showTolerance}
          onChange={(event) => onToggleTolerance(event.target.checked)}
          className="h-4 w-4 rounded border-amber-300 text-teal-700 focus:ring-amber-400"
        />
        Include measurement tolerance (±)
      </label>

      {showTolerance && toleranceOnlyForOgRdf ? (
        <p className="text-xs text-amber-700">
          Tolerance propagation is applied for the OG + RDF pair (the documented
          uncertainty path). Other pairs derive point values.
        </p>
      ) : null}
    </div>
  );
}

interface SlotFieldProps {
  slot: AnalysisSlot;
  otherKey: AnalysisKey;
  showTolerance: boolean;
  onKeyChange: (key: AnalysisKey) => void;
  onValueChange: (value: number | '') => void;
  onToleranceChange: (value: number | '') => void;
}

function AnalysisSlotField({
  slot,
  otherKey,
  showTolerance,
  onKeyChange,
  onValueChange,
  onToleranceChange,
}: SlotFieldProps) {
  const selectId = useId();
  const meta = ANALYSIS_META[slot.key];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor={selectId}
          className="text-xs font-semibold uppercase tracking-wide text-amber-700"
        >
          Known analysis
        </label>
        <select
          id={selectId}
          value={slot.key}
          onChange={(event) => onKeyChange(event.target.value as AnalysisKey)}
          className={cn(
            'w-full rounded-lg border border-amber-200 bg-parchment px-3 py-2 text-sm text-ink',
            'focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40',
          )}
        >
          {ANALYSIS_ORDER.map((key) => {
            const redundant = key !== slot.key && isRedundantPair(key, otherKey);
            return (
              <option key={key} value={key} disabled={redundant}>
                {ANALYSIS_META[key].label} ({ANALYSIS_META[key].short})
                {redundant ? ' — conflicts' : ''}
              </option>
            );
          })}
        </select>
      </div>

      <NumberField
        label="Value"
        value={slot.value}
        onChange={onValueChange}
        unit={meta.unit || undefined}
        hint={meta.hint}
        step={meta.step}
        min={meta.min}
        max={meta.max}
      />

      {showTolerance ? (
        <NumberField
          label="Tolerance ±"
          value={slot.tolerance}
          onChange={onToleranceChange}
          unit={meta.unit || undefined}
          step={meta.step}
          min={0}
          placeholder="0"
        />
      ) : null}
    </div>
  );
}
