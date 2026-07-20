/**
 * Hop additions & utilization.
 * Source: the calculations reference §6, §8, §9.
 */

// ---------------------------------------------------------------------------
// §6 Hop additions
// ---------------------------------------------------------------------------

export interface BitteringHopInput {
  bbl2: number; // finished/kettle volume, bbl
  percentOfIBU: number; // Formula, % of IBU
  baseUnitPerUnit: number; // unit conversion factor
  ibu: number; // target IBU
  percentAlphaAcid: number; // % alpha acid
  hopUtilization: number; // %
  hopExtractYield?: number | null; // % yield override
}

/**
 * Bittering hop quantity (Formula, % of IBU).
 * Quantity = bbl2*258*(%ofIBU)/BaseUnitPerUnit*IBU / ((%AlphaAcid)*(HopUtilization)*1e4)
 * If a hop extract yield is supplied, override: Quantity *= HopUtilization / HopExtractYield.
 */
export function bitteringHopQuantity(input: BitteringHopInput): number {
  const { bbl2, percentOfIBU, baseUnitPerUnit, ibu, percentAlphaAcid, hopUtilization, hopExtractYield } =
    input;
  let quantity =
    (bbl2 * 258 * (percentOfIBU / baseUnitPerUnit) * ibu) /
    (percentAlphaAcid * hopUtilization * 1e4);
  if (hopExtractYield) {
    quantity = (quantity * hopUtilization) / hopExtractYield;
  }
  return quantity;
}

export interface NonBitteringHopInput {
  mgPerLiter: number; // Formula, mg/L
  baseUnitPerUnit: number;
  bbl2: number;
  /** BaseUnitname of the target quantity unit; affects the final scaling. */
  baseUnitName?: 'pounds' | 'lbs/100 bbls uncut' | 'lbs/100 bbls fin';
  bbl1?: number; // fermenter volume, needed for "lbs/100 bbls uncut"
}

/**
 * Non-bittering hop (beta acid / dry hop) quantity (Formula, mg/L).
 * Quantity = (mg/L)/BaseUnitPerUnit * (bbl2*1.1734*2.2046) / 1e4
 */
export function nonBitteringHopQuantity(input: NonBitteringHopInput): number {
  const { mgPerLiter, baseUnitPerUnit, bbl2, baseUnitName, bbl1 } = input;
  let quantity = ((mgPerLiter / baseUnitPerUnit) * (bbl2 * 1.1734 * 2.2046)) / 1e4;
  if (baseUnitName === 'lbs/100 bbls uncut' && bbl1) {
    quantity = quantity / (bbl1 / 100);
  } else if (baseUnitName === 'lbs/100 bbls fin') {
    quantity = quantity / (bbl2 / 100);
  }
  return quantity;
}

// ---------------------------------------------------------------------------
// §8 Kettle Hop Utilization (measured)
// ---------------------------------------------------------------------------

export interface MeasuredHopUtilizationInput {
  bbl2: number;
  percentOfIBU: number;
  ibu: number;
  hopLbsTimesAlpha: number; // Sigma(lbs of hop * solids % alpha acids)
}

/**
 * HopUtil% = bbl2*258*(%ofIBU)*IBU / (Sigma lbs hop*solids%alpha) / 1e4
 */
export function measuredHopUtilization(input: MeasuredHopUtilizationInput): number {
  const { bbl2, percentOfIBU, ibu, hopLbsTimesAlpha } = input;
  return (bbl2 * 258 * percentOfIBU * ibu) / hopLbsTimesAlpha / 1e4;
}

/**
 * Back-calc adjustment analogous to §7 brewhouse-efficiency back-calc, applied when
 * Sigma(%ofIBU) != 100: HopUtil% = HopUtil% * (100 - FBU_A) / (FBU_T - FBU_A)
 */
export function backCalcHopUtilization(
  hopUtilizationPercent: number,
  fbuAfterBrewhouse: number,
  fbuTotal: number
): number {
  return (hopUtilizationPercent * (100 - fbuAfterBrewhouse)) / (fbuTotal - fbuAfterBrewhouse);
}

// ---------------------------------------------------------------------------
// §9 Estimated Kettle Hop Utilization — Malowicki & Shellhammer (2005) kinetic model.
// ---------------------------------------------------------------------------

/** Isomerization rate constant, 1/min: k1 = 7.9e11*exp(-11858/373.15) */
export const K1_ISOMERIZATION = 7.9e11 * Math.exp(-11858 / 373.15);

/** Degradation rate constant, 1/min: k2 = 4.1e12*exp(-12994/373.15) */
export const K2_DEGRADATION = 4.1e12 * Math.exp(-12994 / 373.15);

/**
 * % iso-alpha acid isomerized in an aqueous model solution (pH 5.2, 373.15 K) after t minutes.
 * t = minutes boiled + hot wort settling time + 0.5*cooling time at 190F.
 */
export function isoAlphaAqueous(tMinutes: number): number {
  const k1 = K1_ISOMERIZATION;
  const k2 = K2_DEGRADATION;
  return (k1 * 100 * (Math.exp(-k1 * tMinutes) - Math.exp(-k2 * tMinutes))) / (k2 - k1);
}

/**
 * McMurrough wort-gravity correction: %IsoAlpha_wort = %IsoAlpha_aqueous * exp(-8.72*(SG-1))
 */
export function isoAlphaWort(tMinutes: number, sg: number): number {
  return isoAlphaAqueous(tMinutes) * Math.exp(-8.72 * (sg - 1));
}

/**
 * Estimated kettle hop utilization (%) — %HopUtilization = 1.0 * %IsoAlpha_wort.
 */
export function estimatedKettleHopUtilization(tMinutes: number, sg: number): number {
  return 1.0 * isoAlphaWort(tMinutes, sg);
}
