import { describe, it, expect } from 'vitest';
import {
  blendedOG,
  blendedRDF,
  preprimedAdjustFactor,
  blendedScalar,
  blendedPH,
} from '@/lib/engine/blending';

describe('blending engine', () => {
  it('blendedOG reduces to the pure-beer OG at v1=100 or v1=0', () => {
    expect(blendedOG(14, 12, 100)).toBeCloseTo(14, 1);
    expect(blendedOG(14, 12, 0)).toBeCloseTo(12, 1);
  });

  it('blendedOG at v1=50 falls between the two OGs', () => {
    const og = blendedOG(14, 12, 50);
    expect(og).toBeGreaterThan(12);
    expect(og).toBeLessThan(14);
  });

  it('blendedRDF reduces to beer-1 RDF at v1=100', () => {
    const rdf = blendedRDF(14, 65, 12, 60, 100);
    expect(rdf).toBeCloseTo(65, 1);
  });

  it('blendedRDF reduces to beer-2 RDF at v1=0', () => {
    const rdf = blendedRDF(14, 65, 12, 60, 0);
    expect(rdf).toBeCloseTo(60, 1);
  });

  it('preprimedAdjustFactor is 1 when OG1a equals OG1', () => {
    expect(preprimedAdjustFactor(12, 12)).toBeCloseTo(1, 8);
  });

  it('blendedScalar averages two values by volume fraction', () => {
    expect(blendedScalar(10, 20, 50)).toBeCloseTo(15, 5);
    expect(blendedScalar(10, 20, 100)).toBeCloseTo(10, 5);
    expect(blendedScalar(10, 20, 0)).toBeCloseTo(20, 5);
  });

  it('blendedPH is between the two component pH values', () => {
    const ph = blendedPH(4.0, 4.4, 50);
    expect(ph).toBeGreaterThan(4.0);
    expect(ph).toBeLessThan(4.4);
  });

  it('blendedPH reduces to beer-1 pH at v1c=100', () => {
    expect(blendedPH(4.2, 4.6, 100)).toBeCloseTo(4.2, 5);
  });
});
