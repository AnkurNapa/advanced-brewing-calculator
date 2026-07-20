/**
 * Estimated Beer Color (SRM).
 * Source: the calculations reference §5.
 *
 * Assumes kettle color gain approximately cancels fermentation color loss.
 * Malt color reference: Congress Wort Color at 8.0 Plato = 21.32 lbs extract/bbl.
 */

import { fSGE, lbbl } from './gravity';

const CONGRESS_WORT_LBBL = 21.32;

export interface MaltColorLine {
  percentOfExtract: number;
  maltColor: number; // deg Lovibond/SRM as-is
}

/** Color from Malt = (%ofExtract)/100 * MaltColor * lbbl(OG2pp) / 21.32 */
export function colorFromMalt(line: MaltColorLine, og2pp: number): number {
  return ((line.percentOfExtract / 100) * line.maltColor * lbbl(og2pp)) / CONGRESS_WORT_LBBL;
}

export type SyrupColorBaseUnit = 'barrels' | 'pounds' | 'bbls/100 bbls fin' | 'lbs/100 bbls fin';

export interface SyrupColorLine {
  syrupColor: number;
  quantity: number;
  baseUnitPerUnit: number;
  baseUnitName: SyrupColorBaseUnit;
  percentExtractAsIs?: number; // required for 'pounds' / 'lbs/100 bbls fin'
  bbl2?: number; // required for 'barrels' / 'pounds'
}

/** Color from Syrup — unit-dependent variants per KB §5/Chapter 3 p.44. */
export function colorFromSyrup(line: SyrupColorLine): number {
  const { syrupColor, quantity, baseUnitPerUnit, baseUnitName, percentExtractAsIs, bbl2 } = line;
  if (baseUnitName === 'barrels') {
    if (bbl2 === undefined) throw new Error('bbl2 required for barrels-based syrup color');
    return (syrupColor * quantity * baseUnitPerUnit) / bbl2;
  }
  if (baseUnitName === 'pounds') {
    if (bbl2 === undefined || percentExtractAsIs === undefined) {
      throw new Error('bbl2 and percentExtractAsIs required for pounds-based syrup color');
    }
    return (syrupColor * quantity * baseUnitPerUnit) / (258 * fSGE(percentExtractAsIs)) / bbl2;
  }
  if (baseUnitName === 'bbls/100 bbls fin') {
    return (syrupColor * quantity * baseUnitPerUnit) / 100;
  }
  // lbs/100 bbls fin
  if (percentExtractAsIs === undefined) {
    throw new Error('percentExtractAsIs required for lbs/100 bbls fin syrup color');
  }
  return (syrupColor * quantity * baseUnitPerUnit) / (258 * fSGE(percentExtractAsIs)) / 100;
}

/** Beer Color = Sum(Color from Malt) + Sum(Color from Syrup) */
export function estimatedBeerColor(maltColors: number[], syrupColors: number[]): number {
  const maltTotal = maltColors.reduce((a, b) => a + b, 0);
  const syrupTotal = syrupColors.reduce((a, b) => a + b, 0);
  return maltTotal + syrupTotal;
}

/** SRM -> EBC conversion (§19): EBC = SRM * 1.97 */
export function srmToEbc(srm: number): number {
  return srm * 1.97;
}

/** EBC -> SRM conversion. */
export function ebcToSrm(ebc: number): number {
  return ebc / 1.97;
}
