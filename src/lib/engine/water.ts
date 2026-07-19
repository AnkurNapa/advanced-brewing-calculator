/**
 * Water chemistry — residual alkalinity.
 * Source: MasterBrewers_KB/04_Calculations_Reference.md §17.
 */

/**
 * RA (mg/L as CaCO3) = ppmHCO3*50/61 - ppmCa*50/20/3.5 - ppmMg*50/12.2/7
 */
export function residualAlkalinity(ppmHco3: number, ppmCa: number, ppmMg: number): number {
  return (ppmHco3 * 50) / 61 - (ppmCa * 50) / 20 / 3.5 - (ppmMg * 50) / 12.2 / 7;
}

/** RA (deg dH) = RA(mg/L as CaCO3) / 17.85 */
export function residualAlkalinityDegDh(raMgL: number): number {
  return raMgL / 17.85;
}

/** 88% Lactic acid addition factor: RA contribution = (ppm by vol) * 0.586 */
export const LACTIC_ACID_88_FACTOR = 0.586;

/** 75% Phosphoric acid addition factor: RA contribution = (ppm by vol) * 0.604 */
export const PHOSPHORIC_ACID_75_FACTOR = 0.604;

/**
 * Generic acid-addition RA: RA = ppmByVol * density * (%w/w/100) * 50/(MW/valence)
 */
export function acidAdditionRA(
  ppmByVol: number,
  densityGPerMl: number,
  percentWwOver100: number,
  molecularWeight: number,
  valence: number
): number {
  return ppmByVol * densityGPerMl * percentWwOver100 * (50 / (molecularWeight / valence));
}

/**
 * Mash-vessel RA accounting for grain-in water RA plus calcium precipitation and acid additions:
 * RA = GrainInWaterRA - ppmCa*50/(40/2)/3.5 - ppmByVol88Lactic*0.586 - ppmByVol75Phos*0.604
 */
export function mashVesselRA(
  grainInWaterRA: number,
  ppmCa: number,
  ppmByVol88Lactic: number,
  ppmByVol75Phosphoric: number
): number {
  return (
    grainInWaterRA -
    (ppmCa * 50) / (40 / 2) / 3.5 -
    ppmByVol88Lactic * LACTIC_ACID_88_FACTOR -
    ppmByVol75Phosphoric * PHOSPHORIC_ACID_75_FACTOR
  );
}

/**
 * Alkalinity-increasing addition (carbonates): RA = GrainInWaterRA - ppmCa*50/(40/2)/3.5
 * + ppmCO3*50/(60/2) + ppmHCO3*50/61
 */
export function alkalinityIncreaseRA(
  grainInWaterRA: number,
  ppmCa: number,
  ppmCo3: number,
  ppmHco3: number
): number {
  return grainInWaterRA - (ppmCa * 50) / (40 / 2) / 3.5 + (ppmCo3 * 50) / (60 / 2) + (ppmHco3 * 50) / 61;
}
