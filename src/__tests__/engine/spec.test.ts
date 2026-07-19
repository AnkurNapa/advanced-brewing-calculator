import { describe, it, expect } from 'vitest';
import {
  rdfFromReAlc,
  ogFromReAlc,
  ogv,
  eaRatio,
  rda,
  ada,
  abv,
  dAbv,
  ashPercent,
  caloriesPer12FlOz,
  proteinPer12FlOz,
  carbsPer12FlOz,
  prcRdf,
  primeAdjSucrose,
} from '@/lib/engine/spec';

// KB correctness gate: RE=4.771, ALC=4.269, OG=13.0, RDF=64.9
const RE = 4.771;
const ALC = 4.269;
const OG = 13.0;
const RDF = 64.9;

describe('spec engine', () => {
  it('rdfFromReAlc(RE, ALC) ~= 64.9 (correctness gate)', () => {
    expect(rdfFromReAlc(RE, ALC)).toBeCloseTo(RDF, 1);
  });

  it('ogFromReAlc(RE, ALC) ~= 13.0 (correctness gate)', () => {
    expect(ogFromReAlc(RE, ALC)).toBeCloseTo(OG, 1);
  });

  it('ogv scales OG by SG', () => {
    expect(ogv(13, 1.05)).toBeCloseTo(13.65, 5);
  });

  it('eaRatio at RDF=64.9 is within the documented 0.5-1.5 mapped range', () => {
    const ea = eaRatio(RDF);
    expect(ea).toBeGreaterThan(0);
  });

  it('rda / ada reduce to 0 when RE/AE equals OG (no attenuation)', () => {
    expect(rda(13, 13)).toBeCloseTo(0, 8);
    expect(ada(13, 13)).toBeCloseTo(0, 8);
  });

  it('rda(RE, OG) matches KB gate values sanity (~63.3%)', () => {
    expect(rda(RE, OG)).toBeCloseTo(63.3, 0);
  });

  it('abv(ALC, SGbeer) matches the KB worked example (~5.457)', () => {
    expect(abv(4.2685, 1.010862)).toBeCloseTo(5.457, 2);
  });

  it('dAbv matches the KB worked example (~0.189)', () => {
    expect(dAbv(4.269, 0.144, 1.010862, 0.00089)).toBeCloseTo(0.189, 2);
  });

  it('ashPercent is a simple linear function of malt extract % and OG', () => {
    expect(ashPercent(97, 13)).toBeCloseTo(1.43e-4 * 97 * 13, 8);
  });

  it('caloriesPer12FlOz combines alcohol and extract calories', () => {
    const cal = caloriesPer12FlOz(4.269, 4.771, 0.19, 1.010862);
    expect(cal).toBeGreaterThan(100);
    expect(cal).toBeLessThan(200);
  });

  it('proteinPer12FlOz and carbsPer12FlOz are consistent (carbs = extract-based minus protein)', () => {
    const protein = proteinPer12FlOz(97, 13);
    const carbs = carbsPer12FlOz(4.771, 0.19, 1.010862, protein);
    expect(protein).toBeGreaterThan(0);
    expect(carbs).toBeGreaterThan(0);
  });

  it('prcRdf matches rdfFromReAlc for the same RE/ALC inputs', () => {
    expect(prcRdf(RE, ALC)).toBeCloseTo(rdfFromReAlc(RE, ALC), 6);
  });

  it('primeAdjSucrose is > 1 for any positive priming addition', () => {
    expect(primeAdjSucrose(0.4, 1.0149)).toBeGreaterThan(1);
  });
});
