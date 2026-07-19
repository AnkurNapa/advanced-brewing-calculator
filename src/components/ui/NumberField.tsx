'use client';

import { useId } from 'react';
import { cn } from './cn';

interface NumberFieldProps {
  label: string;
  value: number | '';
  onChange: (value: number | '') => void;
  /** Trailing unit hint shown inside the field (e.g. "bbl", "°P"). */
  unit?: string;
  /** Helper text below the field. */
  hint?: string;
  id?: string;
  name?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Labeled numeric input with an optional unit hint. Emits a parsed number,
 * or '' when the field is cleared (so callers can distinguish empty from 0).
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  id,
  name,
  min,
  max,
  step,
  placeholder,
  disabled = false,
  className,
}: NumberFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label
        htmlFor={fieldId}
        className="text-xs font-semibold uppercase tracking-wide text-amber-700"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          name={name}
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={(event) => {
            const raw = event.target.value;
            onChange(raw === '' ? '' : Number(raw));
          }}
          className={cn(
            'w-full rounded-lg border border-amber-200 bg-parchment px-3 py-2 text-sm text-ink',
            'tabular-nums placeholder:text-amber-600/60',
            'focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40',
            'disabled:cursor-not-allowed disabled:bg-amber-50 disabled:opacity-70',
            unit && 'pr-12',
          )}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-amber-600">
            {unit}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-amber-700">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
