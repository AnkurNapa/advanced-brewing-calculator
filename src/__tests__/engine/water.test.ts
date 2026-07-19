import { describe, it, expect } from 'vitest';
import {
  residualAlkalinity,
  residualAlkalinityDegDh,
  acidAdditionRA,
  LACTIC_ACID_88_FACTOR,
  PHOSPHORIC_ACID_75_FACTOR,
  mashVesselRA,
} from '@/lib/engine/water';

describe('water engine', () => {
  it('computes residual alkalinity from HCO3/Ca/Mg ppm', () => {
    const ra = residualAlkalinity(122, 40, 12.2);
    // RA = 122*50/61 - 40*50/20/3.5 - 12.2*50/12.2/7
    const expected = (122 * 50) / 61 - (40 * 50) / 20 / 3.5 - (12.2 * 50) / 12.2 / 7;
    expect(ra).toBeCloseTo(expected, 8);
  });

  it('converts RA to deg dH by dividing by 17.85', () => {
    expect(residualAlkalinityDegDh(178.5)).toBeCloseTo(10, 5);
  });

  it('matches the KB 88% lactic acid factor (~0.586)', () => {
    const ra = acidAdditionRA(1, 1.203, 0.88, 90.1, 1);
    expect(ra).toBeCloseTo(LACTIC_ACID_88_FACTOR, 2);
  });

  it('matches the KB 75% phosphoric acid factor (~0.604)', () => {
    const ra = acidAdditionRA(1, 1.579, 0.75, 98, 1);
    expect(ra).toBeCloseTo(PHOSPHORIC_ACID_75_FACTOR, 3);
  });

  it('mashVesselRA subtracts calcium and acid contributions from grain-in water RA', () => {
    const ra = mashVesselRA(50, 40, 10, 0);
    expect(ra).toBeLessThan(50);
  });

  it('zero acid additions leave RA unaffected by acid terms', () => {
    const withAcid = mashVesselRA(50, 0, 10, 0);
    const withoutAcid = mashVesselRA(50, 0, 0, 0);
    expect(withAcid).toBeLessThan(withoutAcid);
  });
});
