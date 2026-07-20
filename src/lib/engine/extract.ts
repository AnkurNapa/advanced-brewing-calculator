/**
 * Extract additions — Malt, Grits, Syrup, Kräusen (Formula = "% of Extract").
 * Source: the calculations reference §3.
 */

import { fSGE, lbbl } from './gravity';

export interface ExtractAdditionInput {
  bbl1: number; // fermenter volume
  og1: number; // fermenter OG, °Plato
  percentOfExtract: number; // Formula, % of extract
  solidsPercent: number; // material solids %, as-is
  /** true if added before lauter (needs brewhouse-efficiency correction). */
  beforeLauter?: boolean;
  brewhouseEfficiencyPercent?: number; // required when beforeLauter=true
}

/**
 * Base quantity (lbs) for a malt/grits/syrup/kräusen addition.
 * Quantity = bbl1 * lbbl(OG1) * (%ofExtract) / (solids%)
 * If before lauter: divide further by (BrewhouseEfficiency/100).
 */
export function extractAdditionQuantityLbs(input: ExtractAdditionInput): number {
  const { bbl1, og1, percentOfExtract, solidsPercent, beforeLauter, brewhouseEfficiencyPercent } =
    input;
  let quantity = (bbl1 * lbbl(og1) * percentOfExtract) / solidsPercent;
  if (beforeLauter) {
    if (!brewhouseEfficiencyPercent) {
      throw new Error('brewhouseEfficiencyPercent is required when beforeLauter=true');
    }
    quantity = quantity / (brewhouseEfficiencyPercent / 100);
  }
  return quantity;
}

/** Convert an lbs quantity to kilograms: Quantity(kg) = Quantity(lbs) / BaseUnitPerUnit. */
export function extractAdditionQuantityKg(lbsQuantity: number, baseUnitPerUnit: number): number {
  return lbsQuantity / baseUnitPerUnit;
}

/**
 * Convert an lbs quantity to gallons (for liquid syrups):
 * Quantity(gal) = Quantity(lbs) / BaseUnitPerUnit / (fSGE(%extract as-is) * 258)
 */
export function extractAdditionQuantityGallons(
  lbsQuantity: number,
  baseUnitPerUnit: number,
  percentExtractAsIs: number
): number {
  return lbsQuantity / baseUnitPerUnit / (fSGE(percentExtractAsIs) * 258);
}

/** Track post-lauter syrup % of extract: Fext_A = Sum(%ofExtract), for materials added after lauter. */
export function postLauterExtractFraction(afterLauterPercentages: number[]): number {
  return afterLauterPercentages.reduce((sum, pct) => sum + pct, 0);
}

/**
 * Track post-lauter syrup volume (bbl):
 * VSyr = Sum(Quantity * BaseUnitPerUnit / (fSGE(%extract as-is) * 258))
 * If the material's base unit is already barrels: VSyr = Sum(Quantity * BaseUnitPerUnit).
 */
export interface SyrupVolumeLine {
  quantity: number;
  baseUnitPerUnit: number;
  percentExtractAsIs: number;
  baseUnitIsBarrels?: boolean;
}

export function postLauterSyrupVolumeBbl(lines: SyrupVolumeLine[]): number {
  return lines.reduce((sum, line) => {
    if (line.baseUnitIsBarrels) {
      return sum + line.quantity * line.baseUnitPerUnit;
    }
    return sum + (line.quantity * line.baseUnitPerUnit) / (fSGE(line.percentExtractAsIs) * 258);
  }, 0);
}
