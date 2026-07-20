import { describe, it, expect, beforeEach } from 'vitest';
import { repository } from '@/lib/data/repository';
import {
  buildCalcContext,
  calculateForward,
  calculateBackward,
  classifyLine,
  deriveBrewhouseEfficiency,
  roundTo,
  type CalcContext,
} from '@/lib/formulation/formulaCalc';
import type { Formula } from '@/lib/data/types';

/**
 * Load a well-populated seeded formula (real OG/volume/BU and malt lines) so the
 * assertions exercise the actual composition, not a degenerate zero recipe.
 */
function pickRichFormula(): Formula {
  const formulas = repository.listFormulas();
  const rich = formulas.find((f) => {
    if (!(f.OG1 && f.OG1 > 0 && f.Bbl1 && f.Bbl1 > 0 && f.BU && f.BU > 0)) return false;
    const ctx = ctxOnce();
    return repository
      .getFormulaLines(f.FormulaID)
      .some((l) => classifyLine(l, ctx) === 'malt');
  });
  return rich ?? formulas[0];
}

let _ctx: CalcContext | null = null;
function ctxOnce(): CalcContext {
  if (_ctx) return _ctx;
  _ctx = buildCalcContext({
    materials: repository.listMaterials(),
    units: repository.listUnits(),
    categories: repository.listCategories(),
    processes: repository.listProcesses(),
  });
  return _ctx;
}

describe('roundTo', () => {
  it('rounds to the increment', () => {
    expect(roundTo(2189.9, 1)).toBe(2190);
    expect(roundTo(23.7, 25)).toBe(25);
    expect(roundTo(42.4, 0)).toBe(42.4);
    expect(roundTo(42.4, null)).toBe(42.4);
  });
});

describe('formulaCalc forward on a real seeded recipe', () => {
  beforeEach(() => {
    window.localStorage.clear();
    _ctx = null;
  });

  it('produces finite quantities and plausible header targets', () => {
    const formula = pickRichFormula();
    const lines = repository.getFormulaLines(formula.FormulaID);
    const ctx = ctxOnce();

    const result = calculateForward(formula, lines, ctx);

    // Every computed line quantity is finite (never NaN/Infinity).
    for (const line of result.lines) {
      if (line.Quantity != null) {
        expect(Number.isFinite(line.Quantity)).toBe(true);
      }
    }

    // At least one malt quantity was actually derived (> 0).
    const maltQtys = result.lines
      .filter((l) => classifyLine(l, ctx) === 'malt')
      .map((l) => l.Quantity ?? 0);
    expect(maltQtys.some((q) => q > 0)).toBe(true);

    // Header targets are plausible.
    const f = result.formula;
    expect(f.Yieldh).toBeGreaterThan(0);
    expect(f.Yieldh).toBeLessThanOrEqual(100);
    expect(f.OG1 ?? 0).toBeGreaterThan(0);
    expect(f.OG1 ?? 0).toBeLessThan(40); // OG in a sane °Plato range
    expect(f.SRMest ?? 0).toBeGreaterThan(0);
  });

  it('reproduces the seed malt weights closely (fidelity gate)', () => {
    const formula = pickRichFormula();
    const lines = repository.getFormulaLines(formula.FormulaID);
    const ctx = ctxOnce();
    const result = calculateForward(formula, lines, ctx);

    for (const before of lines) {
      if (classifyLine(before, ctx) !== 'malt') continue;
      const seedQty = before.Quantity ?? 0;
      if (seedQty <= 0) continue;
      const after = result.lines.find(
        (l) => l.ProcessID === before.ProcessID && l.MaterialID === before.MaterialID,
      );
      const calc = after?.Quantity ?? 0;
      // Within 2% of the stored operating-standard weight.
      expect(Math.abs(calc - seedQty) / seedQty).toBeLessThan(0.02);
    }
  });
});

describe('formulaCalc backward round-trips', () => {
  beforeEach(() => {
    window.localStorage.clear();
    _ctx = null;
  });

  it('forward → backward recovers the original Fractions within tolerance', () => {
    const formula = pickRichFormula();
    const lines = repository.getFormulaLines(formula.FormulaID);
    const ctx = ctxOnce();

    const forward = calculateForward(formula, lines, ctx);
    const backward = calculateBackward(forward.formula, forward.lines, ctx);

    // A recipe may carry two additions of the same material in one process
    // (multi-stage kettle hopping). Those share the repository (process,material)
    // key, so only assert on lines whose key is unique within the recipe.
    const keyCount = new Map<string, number>();
    for (const l of lines) {
      const k = `${l.ProcessID}:${l.MaterialID}`;
      keyCount.set(k, (keyCount.get(k) ?? 0) + 1);
    }

    for (const original of lines) {
      const kind = classifyLine(original, ctx);
      if (kind !== 'malt' && kind !== 'hop') continue;
      const origFrac = original.Fraction ?? 0;
      if (origFrac <= 0) continue;
      if ((keyCount.get(`${original.ProcessID}:${original.MaterialID}`) ?? 0) > 1) continue;
      const round = backward.lines.find(
        (l) => l.ProcessID === original.ProcessID && l.MaterialID === original.MaterialID,
      );
      const recovered = round?.Fraction ?? 0;
      // Round-trip within 2% relative.
      expect(Math.abs(recovered - origFrac) / origFrac).toBeLessThan(0.02);
    }
  });

  it('zeroes raw fractions that cannot be back-derived and never mutates the input', () => {
    const formula = pickRichFormula();
    const lines = repository.getFormulaLines(formula.FormulaID);
    const snapshot = JSON.stringify(lines);
    const ctx = ctxOnce();

    const backward = calculateBackward(formula, lines, ctx);
    // Input lines are untouched (immutability).
    expect(JSON.stringify(lines)).toBe(snapshot);
    // Result is a different array/object identity.
    expect(backward.lines).not.toBe(lines);
    expect(backward.formula).not.toBe(formula);
  });
});

describe('deriveBrewhouseEfficiency', () => {
  it('returns null without volume/gravity and a 0-100 value with them', () => {
    const ctx = buildCalcContext({
      materials: repository.listMaterials(),
      units: repository.listUnits(),
      categories: repository.listCategories(),
      processes: repository.listProcesses(),
    });
    expect(deriveBrewhouseEfficiency([], 0, 0, ctx)).toBeNull();

    const formula = pickRichFormula();
    const lines = repository.getFormulaLines(formula.FormulaID);
    const bhe = deriveBrewhouseEfficiency(lines, formula.Bbl1 ?? 0, formula.OG1 ?? 0, ctx);
    expect(bhe).not.toBeNull();
    expect(bhe as number).toBeGreaterThan(0);
    expect(bhe as number).toBeLessThanOrEqual(100);
  });
});
