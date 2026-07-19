/**
 * Priming syrups (Formula = "% w/w", added to finished beer).
 * Source: MasterBrewers_KB/04_Calculations_Reference.md §4.
 */

import { lbbl, P, SGBeer, REx, ALx } from './gravity';

export type PrimingBaseUnitName = 'bbls/100 bbls fin' | 'lbs/100 bbls fin';

/** Weight factor (wf) — lbs extract per unit of formula quantity. */
export function weightFactor(baseUnitName: PrimingBaseUnitName, percentExtractAsIs: number): number {
  if (baseUnitName === 'bbls/100 bbls fin') {
    return lbbl(percentExtractAsIs);
  }
  return percentExtractAsIs / 100;
}

/** Volume factor (vf) — bbl per unit of formula quantity. wf/(258*1.55454). */
export function volumeFactor(wf: number): number {
  return wf / (258 * 1.55454);
}

export interface PrimingQuantityInput {
  formulaPercentWW: number; // Formula, % w/w
  baseUnitPerUnit: number;
  og2: number; // finished OG, Plato
  primeRDF: number; // syrup RDF
  wf: number; // weight factor
}

/**
 * Quantity(lbs/100 bbls Fin) = (Formula %w/w)/BaseUnitPerUnit * 258 * SG(OG2,PrimeRDF) / wf
 * SG(OG2, RDF) here is beer SG derived via REx/ALx -> SGBeer at the given OG/RDF.
 */
export function primingQuantity(input: PrimingQuantityInput): number {
  const { formulaPercentWW, baseUnitPerUnit, og2, primeRDF, wf } = input;
  const re = REx(og2, 0, primeRDF, 0, 1);
  const alc = ALx(og2, 0, primeRDF, 0, 1);
  const sg = SGBeer(re, alc);
  return ((formulaPercentWW / baseUnitPerUnit) * 258 * sg) / wf;
}

export interface PrimingLine {
  quantity: number;
  baseUnitPerUnit: number;
  wf: number;
  vf: number;
  syrupPercentFerm: number;
}

/** Total extract in prime: lbpx = Sum(quantity*BaseUnitPerUnit*wf) */
export function extractInPrime(lines: PrimingLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.baseUnitPerUnit * l.wf, 0);
}

/** Total volume of prime: bblp = Sum(quantity*BaseUnitPerUnit*vf) */
export function volumeOfPrime(lines: PrimingLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.baseUnitPerUnit * l.vf, 0);
}

/** RDF of prime: rdfp = Sum(lbpx_i * syrup%ferm_i) / Sum(lbpx_i) */
export function rdfOfPrime(lines: PrimingLine[]): number {
  const lbpxLines = lines.map((l) => l.quantity * l.baseUnitPerUnit * l.wf);
  const totalLbpx = lbpxLines.reduce((a, b) => a + b, 0);
  if (totalLbpx === 0) return 0;
  const weighted = lines.reduce((sum, l, i) => sum + lbpxLines[i] * l.syrupPercentFerm, 0);
  return weighted / totalLbpx;
}

/**
 * Pre-primed OG (OG2pp) = Plato((100*lbbl(OG2) - lbpx) / (100 - bblp))
 */
export function prePrimedOG(og2: number, lbpx: number, bblp: number): number {
  return P((100 * lbbl(og2) - lbpx) / (100 - bblp));
}

/**
 * Adjusted volume bbl2 = bbl1 * [lbbl(OG1)/(lbbl(OG2pp)*(1 - bblp/100))] / BaseUnitPerUnit
 */
export function adjustedVolumeBbl2(
  bbl1: number,
  og1: number,
  og2pp: number,
  bblp: number,
  baseUnitPerUnit = 1
): number {
  const platoAdj = lbbl(og1) / (lbbl(og2pp) * (1 - bblp / 100));
  return (bbl1 * platoAdj) / baseUnitPerUnit;
}

/**
 * Beer RDF = ((100-bblp)*lbbl(OG2pp)*RuhRDF + lbpx*rdfp) / (100*lbbl(OG2))
 */
export function primedBeerRDF(
  bblp: number,
  og2pp: number,
  ruhRdf: number,
  lbpx: number,
  rdfp: number,
  og2: number
): number {
  return ((100 - bblp) * lbbl(og2pp) * ruhRdf + lbpx * rdfp) / (100 * lbbl(og2));
}
