/**
 * Brewhouse efficiency + back-calc iteration.
 * Source: MasterBrewers_KB/04_Calculations_Reference.md §7.
 */

import { bblwt, lbbl } from './gravity';

export interface BrewhouseEfficiencyInput {
  bbl1: number; // fermenter volume
  og1: number; // fermenter OG, Plato
  percentOfExtract: number; // Formula, % of extract for this material
  maltWeightTimesSolids: number; // Sigma(lbs malt * solids % extract, cg as-is)
  pitchTempF?: number; // default 64F reference
}

/**
 * BHE% = 100 * bbl1 * bblwt(64)/258.24 * lbbl(OG1) * (%ofExtract) / Sigma(lbs malt*solids%)
 */
export function brewhouseEfficiency(input: BrewhouseEfficiencyInput): number {
  const { bbl1, og1, percentOfExtract, maltWeightTimesSolids, pitchTempF = 64 } = input;
  return (
    (100 * bbl1 * (bblwt(pitchTempF) / 258.24) * lbbl(og1) * percentOfExtract) /
    maltWeightTimesSolids
  );
}

/**
 * Malt solids % extract cg as-is (coarse grind, as-is):
 * = (%Extract fg dry - fineCoarseDiff) * (1 - %moisture/100)
 */
export function maltSolidsExtractCgAsIs(
  extractFgDry: number,
  fineCoarseDiff: number,
  moisturePercent: number
): number {
  return (extractFgDry - fineCoarseDiff) * (1 - moisturePercent / 100);
}

/**
 * Back-calc loop (§7 steps 1-6): if Sigma(%ofExtract for malt+grits+syrup+kräusen) != 100,
 * adjust BHE by BHE*(100-Fext_A)/(Fext_T-Fext_A). Returns the adjusted BHE; the caller is
 * responsible for zeroing %ofExtract and recomputing from weights (that recomputation
 * depends on per-line material data outside this pure function's scope).
 */
export function backCalcBrewhouseEfficiency(
  brewhouseEfficiencyPercent: number,
  fextAfterLauter: number,
  fextTotal: number
): number {
  if (fextTotal === 100) return brewhouseEfficiencyPercent;
  return (brewhouseEfficiencyPercent * (100 - fextAfterLauter)) / (fextTotal - fextAfterLauter);
}
