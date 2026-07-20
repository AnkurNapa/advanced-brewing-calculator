import { describe, it, expect } from 'vitest';
import { getSeed } from '@/lib/data/seedLoader';
import type { CompareFormSpec, Formula, SFormula, Unit } from '@/lib/data/types';
import {
  compareFormulaToSpec,
  DEFAULT_TOLERANCE_FRACTION,
  type CompareInput,
} from '@/lib/compare/compareEngine';

const seed = getSeed();

/** Formula lines for an id, straight from the frozen seed (no overlay). */
function seedFormulaLines(formulaId: number) {
  return seed.formulaDetails.filter((l) => l.FormulaID === formulaId);
}

function seedSpecLines(specId: number) {
  return seed.sFormulaDetails.filter((l) => l.formulaID === specId);
}

/** How many of the rules resolve on both sides for a pairing. */
function resolvableRuleCount(formulaId: number, specId: number): number {
  const fLines = seedFormulaLines(formulaId);
  const sLines = seedSpecLines(specId);
  let n = 0;
  for (const r of seed.compareFormSpec) {
    const f = fLines.some((l) => l.ProcessID === r.FProcessID && l.MaterialID === r.FMaterialID);
    const s = sLines.some((l) => l.processID === r.SProcessID && l.materialID === r.SAnalysisID);
    if (f && s) n += 1;
  }
  return n;
}

/** Find the Plant+Product-matched pairing with the most resolvable rules. */
function bestPair(): { formula: Formula; spec: SFormula; n: number } {
  let best: { formula: Formula; spec: SFormula; n: number } | null = null;
  for (const f of seed.formula) {
    for (const s of seed.sFormula) {
      if (f.PlantID !== s.plantID || f.ProductID !== s.productID) continue;
      const n = resolvableRuleCount(f.FormulaID, s.formulaID);
      if (!best || n > best.n) best = { formula: f, spec: s, n };
    }
  }
  if (!best) throw new Error('no Plant+Product matched Formula/Spec pair in seed');
  return best;
}

function runBestPair(): ReturnType<typeof compareFormulaToSpec> {
  const { formula, spec } = bestPair();
  return compareFormulaToSpec({
    formula,
    spec,
    formulaLines: seedFormulaLines(formula.FormulaID),
    specLines: seedSpecLines(spec.formulaID),
    rules: seed.compareFormSpec,
    units: seed.units,
  });
}

describe('compareFormSpec rules', () => {
  it('loads exactly 13 mapping rules from the seed', () => {
    expect(seed.compareFormSpec).toHaveLength(13);
  });

  it('every rule carries both a formula side and a spec side', () => {
    for (const r of seed.compareFormSpec) {
      expect(typeof r.FProcessID).toBe('number');
      expect(typeof r.FMaterialID).toBe('number');
      expect(typeof r.SProcessID).toBe('number');
      expect(typeof r.SAnalysisID).toBe('number');
    }
  });
});

describe('compareFormulaToSpec', () => {
  it('produces a result covering all 13 rules (matched + unmatched, none dropped)', () => {
    const result = runBestPair();
    expect(result.totalRules).toBe(13);
    expect(result.matchedCount + result.unmatched.length).toBe(13);
    expect(result.rows).toHaveLength(result.matchedCount);
  });

  it('resolves the expected number of mapped rows for the best pairing', () => {
    const { formula, spec, n } = bestPair();
    const result = compareFormulaToSpec({
      formula,
      spec,
      formulaLines: seedFormulaLines(formula.FormulaID),
      specLines: seedSpecLines(spec.formulaID),
      rules: seed.compareFormSpec,
      units: seed.units,
    });
    expect(n).toBeGreaterThan(0);
    expect(result.matchedCount).toBe(n);
  });

  it('reports unmatched rules rather than dropping them', () => {
    // A pairing with no shared lines: formula 37 lines vs a mismatched spec.
    const formula = seed.formula.find((f) => f.FormulaID === 37)!;
    const spec = seed.sFormula[0];
    const result = compareFormulaToSpec({
      formula,
      spec,
      formulaLines: seedFormulaLines(37),
      // Deliberately empty spec side => every rule is unmatched.
      specLines: [],
      rules: seed.compareFormSpec,
      units: seed.units,
    });
    expect(result.matchedCount).toBe(0);
    expect(result.unmatched).toHaveLength(13);
    for (const u of result.unmatched) {
      expect(['no-formula-line', 'no-spec-line', 'no-both']).toContain(u.reason);
    }
  });

  it('normalizes both sides to base units before comparing (differing UnitIDs)', () => {
    // Celsius (perUnit 1.8, intercept 32) vs Fahrenheit (identity): 20 °C and
    // 68 °F are the SAME temperature, so the diff in base units must be 0.
    const celsius: Unit = {
      UnitID: 9001,
      UnitName: 'Celsius',
      BaseUnitID: 19,
      BaseUnitPerUnit: 1.8,
      BaseunitInt: 32,
    };
    const fahrenheit: Unit = {
      UnitID: 9002,
      UnitName: 'Fahrenheit',
      BaseUnitID: 19,
      BaseUnitPerUnit: 1,
      BaseunitInt: 0,
    };
    const rule: CompareFormSpec = {
      sortfield: 1,
      FProcessID: 100,
      FMaterialID: 200,
      FUnitID: celsius.UnitID,
      SProcessID: 300,
      SAnalysisID: 400,
      SUnitID: fahrenheit.UnitID,
    };
    const input: CompareInput = {
      formula: seed.formula[0],
      spec: seed.sFormula[0],
      formulaLines: [
        {
          ...seed.formulaDetails[0],
          FormulaID: seed.formula[0].FormulaID,
          ProcessID: 100,
          MaterialID: 200,
          Quantity: 20, // 20 °C
          Fraction: 20,
        },
      ],
      specLines: [
        {
          ...seed.sFormulaDetails[0],
          formulaID: seed.sFormula[0].formulaID,
          processID: 300,
          materialID: 400,
          q1: '' as unknown as string, // no band => relative-tolerance path
          q2: 68 as unknown as string, // 68 °F
          q3: '' as unknown as string,
          CalcV: null,
          InV: 0,
        },
      ],
      rules: [rule],
      units: [celsius, fahrenheit],
    };
    const result = compareFormulaToSpec(input);
    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row.comparable).toBe(true);
    // 20 °C -> 68 base F ; 68 °F -> 68 base F ; delta exactly 0.
    expect(row.formulaBase).toBeCloseTo(68, 6);
    expect(row.specBase).toBeCloseTo(68, 6);
    expect(row.delta).toBeCloseTo(0, 6);
    expect(row.withinTolerance).toBe(true);
    expect(row.status).toBe('match');
  });

  it('flags rows whose two sides use different base units as not comparable', () => {
    const result = runBestPair();
    const incomparable = result.rows.filter((r) => !r.comparable);
    for (const row of incomparable) {
      expect(row.status).toBe('incomparable');
      expect(row.withinTolerance).toBe(false);
    }
  });

  it('exposes a default tolerance fraction', () => {
    expect(DEFAULT_TOLERANCE_FRACTION).toBeGreaterThan(0);
  });
});
