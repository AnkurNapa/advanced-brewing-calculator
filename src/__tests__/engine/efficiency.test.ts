import { describe, it, expect } from 'vitest';
import {
  brewhouseEfficiency,
  maltSolidsExtractCgAsIs,
  backCalcBrewhouseEfficiency,
} from '@/lib/engine/efficiency';

describe('efficiency engine', () => {
  it('matches the KB Brewhouse Efficiency worked example (~93.08%)', () => {
    const maltWeightTimesSolids = 2190 * 75 + 293 * 63 + 145 * 71 + 112 * 55;
    // NOTE: the KB example uses lbbl(OG1)=38.17 directly, which corresponds to OG1~=14 Plato.
    const bheAtOg14 = brewhouseEfficiency({
      bbl1: 50,
      og1: 14,
      percentOfExtract: 97,
      maltWeightTimesSolids,
    });
    expect(bheAtOg14).toBeCloseTo(93.08, 0);
  });

  it('computes malt solids cg-as-is from fg-dry, fine-coarse diff, and moisture', () => {
    // KB: fine-coarse diff ~1, moisture ~4% -> cg-as-is roughly fg_dry - 1, scaled by (1-0.04)
    const result = maltSolidsExtractCgAsIs(80, 1, 4);
    expect(result).toBeCloseTo((80 - 1) * 0.96, 5);
  });

  it('leaves BHE unchanged when the extract total is already 100%', () => {
    expect(backCalcBrewhouseEfficiency(93.08, 3.03, 100)).toBeCloseTo(93.08, 5);
  });

  it('scales BHE by the missing-total ratio when extract total != 100%', () => {
    const adjusted = backCalcBrewhouseEfficiency(90, 10, 95);
    expect(adjusted).toBeCloseTo((90 * (100 - 10)) / (95 - 10), 5);
  });
});
