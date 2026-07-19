import { describe, it, expect } from 'vitest';
import { colorFromMalt, colorFromSyrup, estimatedBeerColor, srmToEbc, ebcToSrm } from '@/lib/engine/color';

describe('color engine', () => {
  it('matches the KB Beer Color worked example (total ~78.4 SRM)', () => {
    const og2pp = 12.67;
    const bmf = colorFromMalt({ percentOfExtract: 5.01, maltColor: 500 }, og2pp);
    const rb = colorFromMalt({ percentOfExtract: 3, maltColor: 450 }, og2pp);
    const c75 = colorFromMalt({ percentOfExtract: 8.99, maltColor: 75 }, og2pp);
    const tworow = colorFromMalt({ percentOfExtract: 79.98, maltColor: 2.0 }, og2pp);

    expect(bmf).toBeCloseTo(40.4, 0);
    expect(rb).toBeCloseTo(21.8, 0);
    expect(c75).toBeCloseTo(10.9, 0);
    expect(tworow).toBeCloseTo(2.6, 0);

    const molasses = colorFromSyrup({
      syrupColor: 1000,
      quantity: 59.6,
      baseUnitPerUnit: 1,
      baseUnitName: 'pounds',
      percentExtractAsIs: 96,
      bbl2: 56,
    });
    expect(molasses).toBeCloseTo(2.7, 0);

    const total = estimatedBeerColor([bmf, rb, c75, tworow], [molasses]);
    expect(total).toBeCloseTo(78.4, 0);
  });

  it('converts SRM to EBC and back', () => {
    expect(srmToEbc(10)).toBeCloseTo(19.7, 5);
    expect(ebcToSrm(19.7)).toBeCloseTo(10, 5);
  });

  it('throws when required fields are missing for a syrup color variant', () => {
    expect(() =>
      colorFromSyrup({ syrupColor: 10, quantity: 1, baseUnitPerUnit: 1, baseUnitName: 'barrels' })
    ).toThrow();
  });
});
