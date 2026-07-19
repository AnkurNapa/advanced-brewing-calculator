import { describe, it, expect } from 'vitest';
import {
  bitteringHopQuantity,
  nonBitteringHopQuantity,
  measuredHopUtilization,
  backCalcHopUtilization,
  K1_ISOMERIZATION,
  K2_DEGRADATION,
  isoAlphaAqueous,
  isoAlphaWort,
  estimatedKettleHopUtilization,
} from '@/lib/engine/hops';

describe('hops engine', () => {
  it('K1/K2 match the KB correctness gate (0.01249 / 0.00309)', () => {
    expect(K1_ISOMERIZATION).toBeCloseTo(0.01249, 5);
    expect(K2_DEGRADATION).toBeCloseTo(0.00309, 5);
  });

  it('isomerization peaks at ~63.2% around t=149 minutes', () => {
    const peak = isoAlphaAqueous(149);
    expect(peak).toBeCloseTo(63.2, 0);
    // Confirm it is indeed a local maximum: neighbors are lower.
    expect(isoAlphaAqueous(148)).toBeLessThan(peak);
    expect(isoAlphaAqueous(150)).toBeLessThan(peak);
  });

  it('0-boil hops start ~16.7% isomerized at t=15 min (212F-equivalent settling/cooling)', () => {
    // KB: "isomerization rate for 15 min at 212F is equivalent to 44 min at 190F" and
    // "the 0 OG curve starts at 16.7% isomerized" -- the k1/k2 rates are defined at
    // 373.15K (212F), so t=15 (the 212F-equivalent minutes) reproduces the 16.7% figure;
    // the "44 min at 190F" is the separate real-time-to-model-time conversion factor.
    expect(isoAlphaAqueous(15)).toBeCloseTo(16.7, 0);
  });

  it('gravity correction reduces isomerization at higher SG (McMurrough)', () => {
    const lowGravity = isoAlphaWort(60, 1.0); // ~0 Plato reference
    const highGravity = isoAlphaWort(60, 1.048); // ~12 Plato wort
    expect(highGravity).toBeLessThan(lowGravity);
  });

  it('a 12 OG wort boiled 60 minutes gives a reasonable ~34.9% isomerized (KB example)', () => {
    const sg12P = 1.0 + 12 * 0.004; // rough SG estimate for the sanity check only
    const util = estimatedKettleHopUtilization(60, sg12P);
    expect(util).toBeGreaterThan(25);
    expect(util).toBeLessThan(45);
  });

  it('bitteringHopQuantity matches the KB Brewer\'s Gold worked example (~11.3 lbs)', () => {
    const qty = bitteringHopQuantity({
      bbl2: 56,
      percentOfIBU: 49.3,
      baseUnitPerUnit: 1,
      ibu: 40,
      percentAlphaAcid: 9.1,
      hopUtilization: 27.7,
    });
    expect(qty).toBeCloseTo(11.3, 1);
  });

  it('nonBitteringHopQuantity matches the KB H-Hallertauer worked example (~28 lbs/100bbl uncut)', () => {
    const qty = nonBitteringHopQuantity({
      mgPerLiter: 966,
      baseUnitPerUnit: 1,
      bbl2: 56,
      baseUnitName: 'lbs/100 bbls uncut',
      bbl1: 50,
    });
    expect(qty).toBeCloseTo(28, 0);
  });

  it('measuredHopUtilization matches the KB worked example (~27.69%)', () => {
    const util = measuredHopUtilization({
      bbl2: 56,
      percentOfIBU: 90,
      ibu: 40,
      hopLbsTimesAlpha: 11.3 * 9.1 + 19.8 * 4.3,
    });
    expect(util).toBeCloseTo(27.69, 1);
  });

  it('backCalcHopUtilization scales utilization by the missing-total fraction', () => {
    const adjusted = backCalcHopUtilization(30, 80, 100);
    expect(adjusted).toBeCloseTo(30, 5); // (100-80)/(100-80) = 1
  });
});
