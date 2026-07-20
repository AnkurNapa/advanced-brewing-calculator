/**
 * compareEngine.ts
 * Pure comparison orchestrator for the Compare module — a advanced build the
 * the reference brewing model "Compare" application (Functional Spec §8).
 *
 * A `CompareFormSpec` table holds 13 mapping rules. Each rule pins a Formula
 * line (FProcessID, FMaterialID) to a Spec analysis line (SProcessID,
 * SAnalysisID) and records the display unit on each side (FUnitID / SUnitID).
 * For every rule we:
 * 1. find the Formula line matching (FProcessID, FMaterialID),
 * 2. find the Spec line matching (SProcessID, SAnalysisID),
 * 3. normalize BOTH values to their base units (never compare raw values
 * across different UnitIDs), and
 * 4. emit a diff row {label, formulaValue, specValue, unit, delta,
 * withinTolerance, ...}.
 *
 * Rules with no matching line on either side are REPORTED as unmatched, never
 * silently dropped. This module is pure and immutable — no React, no I/O; all
 * data is passed in so it is trivially testable.
 */

import type {
  CompareFormSpec,
  Formula,
  FormulaDetail,
  SFormula,
  SFormulaDetail,
  Unit,
} from '@/lib/data/types';
import { findUnit, toBase } from '@/lib/engine';

/** Default relative tolerance when a spec has no explicit low/high band. */
export const DEFAULT_TOLERANCE_FRACTION = 0.02;

export type CompareStatus = 'match' | 'high' | 'low' | 'incomparable';

/** One resolved diff row: a Formula parameter checked against a Spec analysis. */
export interface CompareRow {
  sortfield: number;
  label: string;
  formulaProcessId: number;
  formulaMaterialId: number;
  specProcessId: number;
  specAnalysisId: number;
  /** Value on the formula side, in its native display unit (FUnitID). */
  formulaValue: number | null;
  /** Nominal target on the spec side, in its native display unit (SUnitID). */
  specValue: number | null;
  /** Spec tolerance band (low/high) in the spec display unit, when present. */
  specLow: number | null;
  specHigh: number | null;
  formulaUnitId: number;
  specUnitId: number;
  formulaUnitName: string | null;
  specUnitName: string | null;
  /** Base-unit id each side normalizes into (for comparability checks). */
  formulaBaseUnitId: number | null;
  specBaseUnitId: number | null;
  /** Values normalized to base units — the only values that may be compared. */
  formulaBase: number | null;
  specBase: number | null;
  /** formulaBase - specBase, in base units (null when either side is absent). */
  delta: number | null;
  /** True only when both sides share the same base unit. */
  comparable: boolean;
  withinTolerance: boolean;
  status: CompareStatus;
}

/** A mapping rule that could not be fully resolved against the two data sets. */
export interface UnmatchedRule {
  sortfield: number;
  formulaProcessId: number;
  formulaMaterialId: number;
  specProcessId: number;
  specAnalysisId: number;
  reason: 'no-formula-line' | 'no-spec-line' | 'no-both';
  label: string;
}

/** Full comparison outcome for one Formula × Spec pairing. */
export interface CompareResult {
  formulaId: number;
  specId: number;
  totalRules: number;
  rows: CompareRow[];
  unmatched: UnmatchedRule[];
  matchedCount: number;
  withinToleranceCount: number;
}

/** Optional label resolver, e.g. to inject material names from the catalog. */
export type LabelResolver = (
  rule: CompareFormSpec,
  formulaLine: FormulaDetail | undefined,
  specLine: SFormulaDetail | undefined,
) => string | undefined;

export interface CompareInput {
  formula: Formula;
  spec: SFormula;
  formulaLines: readonly FormulaDetail[];
  specLines: readonly SFormulaDetail[];
  rules: readonly CompareFormSpec[];
  units: readonly Unit[];
  labelFor?: LabelResolver;
  /** Relative tolerance used when the spec carries no low/high band. */
  toleranceFraction?: number;
}

// ---------------------------------------------------------------------------
// Value extraction (immutable, defensive against DB string/number drift)
// ---------------------------------------------------------------------------

/** Coerce a DB cell (number | numeric-string | blank) to a finite number or null. */
function toNumberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/**
 * Formula-side value: the calculated `Quantity` is the reported figure; fall
 * back to the formulation driver `Fraction` when a line was never calculated.
 */
function formulaValueOf(line: FormulaDetail): number | null {
  const qty = toNumberOrNull(line.Quantity);
  if (qty != null) return qty;
  return toNumberOrNull(line.Fraction);
}

/** Spec-side nominal target: prefer the reported nominal q2, then CalcV, InV. */
function specNominalOf(line: SFormulaDetail): number | null {
  return (
    toNumberOrNull(line.q2) ??
    toNumberOrNull(line.CalcV) ??
    toNumberOrNull(line.InV)
  );
}

/** Normalize a display value to its base unit using the unit's factors. */
function normalizeToBase(
  value: number | null,
  unit: Unit | undefined,
): number | null {
  if (value == null) return null;
  if (!unit) return value; // unknown unit — treat display value as its own base
  return toBase(value, unit);
}

function defaultLabel(
  formulaLine: FormulaDetail | undefined,
  specLine: SFormulaDetail | undefined,
  rule: CompareFormSpec,
): string {
  const specText = specLine?.mtext?.trim();
  if (specText) return specText;
  const formulaText = formulaLine?.MText?.trim();
  if (formulaText) return formulaText;
  return `Process ${rule.SProcessID} · Analysis ${rule.SAnalysisID}`;
}

// ---------------------------------------------------------------------------
// Core comparison
// ---------------------------------------------------------------------------

/**
 * Compare a Formula against a Spec across every CompareFormSpec rule.
 * Returns matched diff rows plus any rules that could not be resolved.
 */
export function compareFormulaToSpec(input: CompareInput): CompareResult {
  const {
    formula,
    spec,
    formulaLines,
    specLines,
    rules,
    units,
    labelFor,
    toleranceFraction = DEFAULT_TOLERANCE_FRACTION,
  } = input;

  const rows: CompareRow[] = [];
  const unmatched: UnmatchedRule[] = [];

  // Stable order: the source sortfield, then process/material for determinism.
  const orderedRules = [...rules].sort(
    (a, b) =>
      a.sortfield - b.sortfield ||
      a.SProcessID - b.SProcessID ||
      a.SAnalysisID - b.SAnalysisID,
  );

  for (const rule of orderedRules) {
    const formulaLine = formulaLines.find(
      (l) => l.ProcessID === rule.FProcessID && l.MaterialID === rule.FMaterialID,
    );
    const specLine = specLines.find(
      (l) => l.processID === rule.SProcessID && l.materialID === rule.SAnalysisID,
    );

    const label =
      labelFor?.(rule, formulaLine, specLine) ??
      defaultLabel(formulaLine, specLine, rule);

    if (!formulaLine || !specLine) {
      const reason: UnmatchedRule['reason'] =
        !formulaLine && !specLine
          ? 'no-both'
          : !formulaLine
            ? 'no-formula-line'
            : 'no-spec-line';
      unmatched.push({
        sortfield: rule.sortfield,
        formulaProcessId: rule.FProcessID,
        formulaMaterialId: rule.FMaterialID,
        specProcessId: rule.SProcessID,
        specAnalysisId: rule.SAnalysisID,
        reason,
        label,
      });
      continue;
    }

    const formulaUnit = findUnit([...units], rule.FUnitID);
    const specUnit = findUnit([...units], rule.SUnitID);

    const formulaValue = formulaValueOf(formulaLine);
    const specValue = specNominalOf(specLine);
    const specLow = toNumberOrNull(specLine.q1);
    const specHigh = toNumberOrNull(specLine.q3);

    // Normalize both sides to base units before any comparison.
    const formulaBase = normalizeToBase(formulaValue, formulaUnit);
    const specBase = normalizeToBase(specValue, specUnit);
    const specLowBase = normalizeToBase(specLow, specUnit);
    const specHighBase = normalizeToBase(specHigh, specUnit);

    const formulaBaseUnitId = formulaUnit?.BaseUnitID ?? null;
    const specBaseUnitId = specUnit?.BaseUnitID ?? null;
    const comparable =
      formulaBaseUnitId != null && formulaBaseUnitId === specBaseUnitId;

    const delta =
      formulaBase != null && specBase != null ? formulaBase - specBase : null;

    const { withinTolerance, status } = evaluateTolerance({
      comparable,
      formulaBase,
      specBase,
      specLowBase,
      specHighBase,
      toleranceFraction,
    });

    rows.push({
      sortfield: rule.sortfield,
      label,
      formulaProcessId: rule.FProcessID,
      formulaMaterialId: rule.FMaterialID,
      specProcessId: rule.SProcessID,
      specAnalysisId: rule.SAnalysisID,
      formulaValue,
      specValue,
      specLow,
      specHigh,
      formulaUnitId: rule.FUnitID,
      specUnitId: rule.SUnitID,
      formulaUnitName: formulaUnit?.UnitName ?? null,
      specUnitName: specUnit?.UnitName ?? null,
      formulaBaseUnitId,
      specBaseUnitId,
      formulaBase,
      specBase,
      delta,
      comparable,
      withinTolerance,
      status,
    });
  }

  const withinToleranceCount = rows.filter((r) => r.withinTolerance).length;

  return {
    formulaId: formula.FormulaID,
    specId: spec.formulaID,
    totalRules: rules.length,
    rows,
    unmatched,
    matchedCount: rows.length,
    withinToleranceCount,
  };
}

interface ToleranceArgs {
  comparable: boolean;
  formulaBase: number | null;
  specBase: number | null;
  specLowBase: number | null;
  specHighBase: number | null;
  toleranceFraction: number;
}

/**
 * Decide whether the formula value sits inside the spec's acceptable range.
 * Prefers the spec's explicit low/high band; otherwise falls back to a
 * relative tolerance around the nominal target. Incomparable units (different
 * base units) can never be "within tolerance".
 */
function evaluateTolerance(args: ToleranceArgs): {
  withinTolerance: boolean;
  status: CompareStatus;
} {
  const {
    comparable,
    formulaBase,
    specBase,
    specLowBase,
    specHighBase,
    toleranceFraction,
  } = args;

  if (!comparable || formulaBase == null) {
    return { withinTolerance: false, status: 'incomparable' };
  }

  // Explicit spec band (q1..q3) is the authoritative tolerance when present.
  if (specLowBase != null && specHighBase != null) {
    const lo = Math.min(specLowBase, specHighBase);
    const hi = Math.max(specLowBase, specHighBase);
    if (formulaBase < lo) return { withinTolerance: false, status: 'low' };
    if (formulaBase > hi) return { withinTolerance: false, status: 'high' };
    return { withinTolerance: true, status: 'match' };
  }

  if (specBase == null) {
    return { withinTolerance: false, status: 'incomparable' };
  }

  // Relative tolerance fallback around the nominal target.
  const allowed = Math.abs(specBase) * toleranceFraction;
  const diff = formulaBase - specBase;
  if (Math.abs(diff) <= allowed) return { withinTolerance: true, status: 'match' };
  return { withinTolerance: false, status: diff > 0 ? 'high' : 'low' };
}
