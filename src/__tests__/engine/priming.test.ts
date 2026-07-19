import { describe, it, expect } from 'vitest';
import {
  weightFactor,
  volumeFactor,
  primingQuantity,
  extractInPrime,
  volumeOfPrime,
  rdfOfPrime,
  prePrimedOG,
  adjustedVolumeBbl2,
  primedBeerRDF,
} from '@/lib/engine/priming';

describe('priming engine', () => {
  it('matches the KB Powder Dextrose worked example (~114 lbs/100bbl fin)', () => {
    const wf = weightFactor('lbs/100 bbls fin', 91.5);
    const primeRDF = (60.9 * (13 - 0.4)) / 13; // ~59.03
    const qty = primingQuantity({
      formulaPercentWW: 0.4,
      baseUnitPerUnit: 1.0,
      og2: 13,
      primeRDF,
      wf,
    });
    expect(qty).toBeCloseTo(114, 0);
  });

  it('computes volume factor from weight factor', () => {
    const wf = weightFactor('bbls/100 bbls fin', 96);
    const vf = volumeFactor(wf);
    expect(vf).toBeGreaterThan(0);
    expect(vf).toBeLessThan(wf);
  });

  it('matches the KB extract-in-prime / volume-of-prime / rdf-of-prime worked example', () => {
    const wf = weightFactor('lbs/100 bbls fin', 91.5);
    const vf = volumeFactor(wf);
    const lines = [{ quantity: 114, baseUnitPerUnit: 1, wf, vf, syrupPercentFerm: 99 }];
    expect(extractInPrime(lines)).toBeCloseTo(104.3, 0);
    expect(volumeOfPrime(lines)).toBeCloseTo(0.26, 1);
    expect(rdfOfPrime(lines)).toBeCloseTo(99, 3);
  });

  it('matches the KB pre-primed OG worked example (OG2pp ~= 12.67)', () => {
    const og2pp = prePrimedOG(13, 104.3, 0.26);
    expect(og2pp).toBeCloseTo(12.67, 1);
  });

  it('matches the KB adjusted volume worked example (bbl2 ~= 56 bbl)', () => {
    const bbl2 = adjustedVolumeBbl2(50, 14, 12.67, 0.26, 1);
    expect(bbl2).toBeCloseTo(56, 0);
  });

  it('matches the KB firkin beer RDF worked example (~62%)', () => {
    const rdf = primedBeerRDF(0.26, 12.67, 60.9, 104.3, 99, 13);
    expect(rdf).toBeCloseTo(62, 0);
  });
});
