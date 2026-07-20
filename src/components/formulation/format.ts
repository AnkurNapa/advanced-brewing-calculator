/**
 * Display helpers for the formulation UI. Pure formatting only — no calc.
 */

import type { Formula, FormulaDetail, Plant, Product, Unit } from '@/lib/data/types';
import type { UnitSystem } from '@/lib/data/types';

/** Base-unit ids that carry a metric alternative worth showing on the toggle. */
const BASE_POUND = 2;
const BASE_BARREL = 6;

const LB_PER_KG = 2.2046226218;
const L_PER_BARREL = 117.347765; // 1 US beer barrel = 117.348 L

/** Format a number for display, trimming trailing zeros; blank for null. */
export function fmt(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(digits));
  return rounded.toLocaleString(undefined, { maximumFractionDigits: digits });
}

/** A parameter value rendered in the active unit system when a metric peer exists. */
export interface DisplayValue {
  value: number | null;
  unit: string;
  /** Optional secondary reading (the other unit system), e.g. "993 kg". */
  alt?: string;
}

/**
 * Render a line's computed quantity respecting the unit-system toggle. Weight
 * (pounds) and volume (barrels) rows convert to kg / litres in metric; all other
 * parameter units (°F, minutes, %, ppm, ...) are shown natively in both systems.
 */
export function displayQuantity(
  quantity: number | null,
  unit: Unit | undefined,
  system: UnitSystem,
): DisplayValue {
  const name = unit?.UnitName ?? '';
  if (quantity == null || !Number.isFinite(quantity)) return { value: null, unit: name };

  if (system === 'metric' && unit?.BaseUnitID === BASE_POUND) {
    const lbs = quantity * (unit.BaseUnitPerUnit ?? 1);
    return { value: lbs / LB_PER_KG, unit: 'kg', alt: `${fmt(quantity)} ${name}` };
  }
  if (system === 'metric' && unit?.BaseUnitID === BASE_BARREL) {
    const bbl = quantity * (unit.BaseUnitPerUnit ?? 1);
    return { value: bbl * L_PER_BARREL, unit: 'L', alt: `${fmt(quantity)} ${name}` };
  }
  return { value: quantity, unit: name };
}

/** Human label for a formula: "Plant · Product · Date". */
export function formulaLabel(
  formula: Formula,
  plant: Plant | undefined,
  product: Product | undefined,
  dateLabel: string | null,
): string {
  const parts = [
    plant?.Plantname ?? `Plant ${formula.PlantID}`,
    product?.ProductName ?? `Product ${formula.ProductID}`,
  ];
  if (dateLabel) parts.push(dateLabel);
  return parts.join(' · ');
}

/** Normalise the seed's mixed date strings into a short readable label. */
export function shortDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.split(' ')[0];
  return trimmed || null;
}

/** The reported (printed) value of a line, coalescing Qtext/Quantity. */
export function reportedText(line: FormulaDetail): string {
  if (line.Qtext != null && String(line.Qtext).trim() !== '') return String(line.Qtext).trim();
  if (line.Quantity != null) return fmt(line.Quantity);
  return '—';
}
