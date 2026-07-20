'use client';

import { useId } from 'react';

export interface PickerOption {
  id: number;
  label: string;
  /** Optional secondary line (e.g. plant · product · date). */
  hint?: string;
}

interface ComparePickerProps {
  label: string;
  eyebrow?: string;
  value: number | null;
  options: readonly PickerOption[];
  onChange: (id: number) => void;
}

/**
 * A single labelled record picker (native <select> for accessibility and zero
 * dependencies). Used twice on the compare page — one for the Formula, one for
 * the Spec.
 */
export function ComparePicker({
  label,
  eyebrow,
  value,
  options,
  onChange,
}: ComparePickerProps) {
  const selectId = useId();
  const selected = options.find((o) => o.id === value) ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      {eyebrow ? (
        <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">
          {eyebrow}
        </span>
      ) : null}
      <label htmlFor={selectId} className="text-sm font-semibold text-amber-900">
        {label}
      </label>
      <select
        id={selectId}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-amber-200 bg-parchment px-3 py-2 text-sm text-ink shadow-sm focus-visible:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {selected?.hint ? (
        <span className="text-xs text-amber-700">{selected.hint}</span>
      ) : null}
    </div>
  );
}
