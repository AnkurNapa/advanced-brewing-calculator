import { describe, it, expect } from 'vitest';
import {
  deriveSpec,
  isRedundantPair,
  type KnownAnalysis,
} from '@/lib/specification/specDerive';
import { abv, srmToEbc, ebcToSrm } from '@/lib/engine';

// KB correctness gate: OG=13.0, RDF=64.9 => RE~4.771, ALC~4.269.
const OG = 13.0;
const RDF = 64.9;
const RE = 4.771;
const ALC = 4.269;

/** Named after the KB uncertainty convention — asserts within a tolerance band. */
function toleranceCloseTo(actual: number, expected: number, tol = 0.01) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
}

function ok(inputs: KnownAnalysis[]) {
  const result = deriveSpec(inputs);
  if (!result.ok) throw new Error(`expected derivation to succeed: ${result.reason}`);
  return result.spec;
}

describe('deriveSpec — OG + RDF (closed-form gate)', () => {
  const spec = ok([
    { key: 'OG', value: OG },
    { key: 'RDF', value: RDF },
  ]);

  it('recovers RE and ALC from the KB worked set', () => {
    toleranceCloseTo(spec.RE, RE);
    toleranceCloseTo(spec.ALC, ALC);
  });

  it('uses the closed-form path for OG + RDF', () => {
    expect(spec.method).toBe('closed-form');
  });

  it('ABV satisfies ABV = ALC * SGbeer / 0.79066', () => {
    toleranceCloseTo(spec.ABV, abv(spec.ALC, spec.SG), 1e-9);
    // Sanity: ~5.46 % vol for this beer.
    toleranceCloseTo(spec.ABV, 5.46, 0.05);
  });

  it('calories match the KB per-12-fl-oz formula on the worked numbers', () => {
    const expected = (6.9 * spec.ALC + 4 * (spec.RE - spec.ash)) * spec.SG * 3.55;
    toleranceCloseTo(spec.calories, expected, 1e-6);
    expect(spec.calories).toBeGreaterThan(100);
    expect(spec.calories).toBeLessThan(200);
  });

  it('propagates tolerances when ± inputs are supplied', () => {
    const withTol = ok([
      { key: 'OG', value: OG, tolerance: 0.2 },
      { key: 'RDF', value: RDF, tolerance: 1.2 },
    ]);
    expect(withTol.tolerances).toBeDefined();
    expect(withTol.tolerances?.dRE).toBeGreaterThan(0);
    expect(withTol.tolerances?.dALC).toBeGreaterThan(0);
    expect(withTol.tolerances?.dABV).toBeGreaterThan(0);
  });
});

describe('deriveSpec — alternate pairs reduce to the same beer', () => {
  const base = ok([
    { key: 'OG', value: OG },
    { key: 'RDF', value: RDF },
  ]);

  it('RE + ALC recovers OG and RDF', () => {
    const spec = ok([
      { key: 'RE', value: base.RE },
      { key: 'ALC', value: base.ALC },
    ]);
    toleranceCloseTo(spec.OG, OG, 0.02);
    toleranceCloseTo(spec.RDF, RDF, 0.05);
  });

  it('OG + AE recovers RDF (~64.9)', () => {
    const spec = ok([
      { key: 'OG', value: OG },
      { key: 'AE', value: base.AE },
    ]);
    expect(spec.method).toBe('numeric');
    toleranceCloseTo(spec.RDF, RDF, 0.2);
    toleranceCloseTo(spec.ALC, ALC, 0.02);
  });

  it('OG + ABV recovers RDF and RE', () => {
    const spec = ok([
      { key: 'OG', value: OG },
      { key: 'ABV', value: base.ABV },
    ]);
    toleranceCloseTo(spec.RDF, RDF, 0.2);
    toleranceCloseTo(spec.RE, RE, 0.02);
  });

  it('ALC + RE recovers OG and RDF', () => {
    const spec = ok([
      { key: 'ALC', value: base.ALC },
      { key: 'RE', value: base.RE },
    ]);
    toleranceCloseTo(spec.OG, OG, 0.02);
    toleranceCloseTo(spec.RDF, RDF, 0.05);
  });
});

describe('deriveSpec — validation', () => {
  it('rejects fewer than two inputs', () => {
    expect(deriveSpec([{ key: 'OG', value: 13 }]).ok).toBe(false);
  });

  it('rejects the same analysis twice', () => {
    expect(deriveSpec([{ key: 'OG', value: 13 }, { key: 'OG', value: 13 }]).ok).toBe(
      false,
    );
  });

  it('rejects the redundant SG + AE pair', () => {
    expect(isRedundantPair('SG', 'AE')).toBe(true);
    expect(
      deriveSpec([{ key: 'SG', value: 1.01 }, { key: 'AE', value: 2.6 }]).ok,
    ).toBe(false);
  });

  it('rejects non-finite values', () => {
    expect(
      deriveSpec([{ key: 'OG', value: Number.NaN }, { key: 'RDF', value: 64.9 }]).ok,
    ).toBe(false);
  });
});

describe('colour conversion', () => {
  it('EBC = SRM * 1.97', () => {
    expect(srmToEbc(10)).toBeCloseTo(19.7, 6);
    expect(ebcToSrm(19.7)).toBeCloseTo(10, 6);
  });
});
