import { describe, it, expect } from 'vitest';
import {
  extractAdditionQuantityLbs,
  extractAdditionQuantityKg,
  extractAdditionQuantityGallons,
  postLauterExtractFraction,
  postLauterSyrupVolumeBbl,
} from '@/lib/engine/extract';

describe('extract engine', () => {
  it('matches the KB Molasses worked example (~59.6 lbs, 50bbl 14P, 3% of extract, 96% solids)', () => {
    const qty = extractAdditionQuantityLbs({
      bbl1: 50,
      og1: 14,
      percentOfExtract: 3,
      solidsPercent: 96,
    });
    expect(qty).toBeCloseTo(59.6, 0);
  });

  it('applies the before-lauter brewhouse-efficiency correction (~64.1 lbs)', () => {
    const qty = extractAdditionQuantityLbs({
      bbl1: 50,
      og1: 14,
      percentOfExtract: 3,
      solidsPercent: 96,
      beforeLauter: true,
      brewhouseEfficiencyPercent: 92.99,
    });
    expect(qty).toBeCloseTo(64.1, 0);
  });

  it('throws when beforeLauter is set without an efficiency', () => {
    expect(() =>
      extractAdditionQuantityLbs({
        bbl1: 50,
        og1: 14,
        percentOfExtract: 3,
        solidsPercent: 96,
        beforeLauter: true,
      })
    ).toThrow();
  });

  it('converts lbs to kg matching the KB 2-row malt example (2190 lbs -> ~993 kg)', () => {
    expect(extractAdditionQuantityKg(2190, 2.2046)).toBeCloseTo(993, 0);
  });

  it('converts lbs to gallons matching the KB Molasses example (~4.7 gals)', () => {
    const gal = extractAdditionQuantityGallons(59.6, 0.03226, 96);
    expect(gal).toBeCloseTo(4.7, 1);
  });

  it('sums post-lauter extract fraction', () => {
    expect(postLauterExtractFraction([3.03])).toBeCloseTo(3.03, 2);
    expect(postLauterExtractFraction([])).toBe(0);
  });

  it('computes post-lauter syrup volume matching the KB Molasses example (~0.15 bbl)', () => {
    const vol = postLauterSyrupVolumeBbl([
      { quantity: 59.6, baseUnitPerUnit: 1, percentExtractAsIs: 96 },
    ]);
    expect(vol).toBeCloseTo(0.15, 2);
  });

  it('treats barrels-based lines as direct quantity*baseUnitPerUnit', () => {
    const vol = postLauterSyrupVolumeBbl([
      { quantity: 2, baseUnitPerUnit: 1, percentExtractAsIs: 96, baseUnitIsBarrels: true },
    ]);
    expect(vol).toBeCloseTo(2, 5);
  });
});
