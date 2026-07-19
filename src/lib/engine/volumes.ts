/**
 * Volumes worked backward from fermenter.
 * Source: MasterBrewers_KB/04_Calculations_Reference.md §11.
 */

import { bblwt, lbbl } from './gravity';

/** Yeast volume = targetConc/slurryConc * fermenterVol / BaseUnitPerUnit */
export function yeastVolume(
  targetConc: number,
  slurryConc: number,
  fermenterVol: number,
  baseUnitPerUnit = 1
): number {
  return ((targetConc / slurryConc) * fermenterVol) / baseUnitPerUnit;
}

/** Trub volume: VTrub = VWhirl * (trub %ofVol)/100 (default 1% if blank). */
export function trubVolume(vWhirl: number, trubPercentOfVol: number | null | undefined): number {
  const pct = trubPercentOfVol ?? 1;
  return (vWhirl * pct) / 100;
}

/** Hopback loss: VHJLoss = lbs hop * (gal/lb hop) / 31 */
export function hopbackLoss(hopLbs: number, galPerLbHop: number): number {
  return (hopLbs * galPerLbHop) / 31;
}

/**
 * Whirlpool volume: VWhirl = bbl1 * bblwt(TPitch)/bblwt(Tboil) + VTrub + VHJLoss
 * VTrub/VHJLoss depend on VWhirl itself; caller iterates or supplies a first-pass VWhirl
 * (e.g. with VTrub estimated from bbl1*1%) then refines.
 */
export function whirlpoolVolume(
  bbl1: number,
  tPitchF: number,
  tBoilF: number,
  vTrub: number,
  vHopbackLoss: number
): number {
  return (bbl1 * bblwt(tPitchF)) / bblwt(tBoilF) + vTrub + vHopbackLoss;
}

/** Whirlpool extract (lbs/bbl equivalent): VWhirle = lbbl(OG1)*(1-fermSyrup%w/w/100)/(1-fermSyrupVol/bbl1) */
export function whirlpoolExtract(
  og1: number,
  fermSyrupPercentWW: number,
  fermSyrupVol: number,
  bbl1: number
): number {
  return (lbbl(og1) * (1 - fermSyrupPercentWW / 100)) / (1 - fermSyrupVol / bbl1);
}

/** Cold wort volume: VCool = (VWhirl - VTrub - VHJLoss) * 247.93 / bblwt(TPitch) */
export function coldWortVolume(
  vWhirl: number,
  vTrub: number,
  vHopbackLoss: number,
  tPitchF: number
): number {
  return ((vWhirl - vTrub - vHopbackLoss) * 247.93) / bblwt(tPitchF);
}

/** Knockout volume: VKO = VWhirl - whirlpool syrup vol */
export function knockoutVolume(vWhirl: number, whirlpoolSyrupVol: number): number {
  return vWhirl - whirlpoolSyrupVol;
}

/** Knockout extract equivalent: VKOe = VWhirle * (1 - whirlpool syrup%w/w/100) */
export function knockoutExtract(vWhirle: number, whirlpoolSyrupPercentWW: number): number {
  return vWhirle * (1 - whirlpoolSyrupPercentWW / 100);
}

/**
 * Chase water (only needed if VKO exceeds kettle max):
 * VKOMax = VKO*VKOe/lbbl(Plato) ; VChaseK = VKO - VKOMax
 */
export function chaseWater(vKO: number, vKOe: number, kettleFullPlato: number): { vKOMax: number; vChaseK: number } {
  const vKOMax = (vKO * vKOe) / lbbl(kettleFullPlato);
  return { vKOMax, vChaseK: vKO - vKOMax };
}

/** Evaporation %: EvapK = (lbbl(PlatoKO) - lbbl(PlatoKF))/lbbl(PlatoKO)*100 */
export function evaporationPercent(platoKnockout: number, platoKettleFull: number): number {
  return ((lbbl(platoKnockout) - lbbl(platoKettleFull)) / lbbl(platoKnockout)) * 100;
}

/** Kettle full volume: VKfull = (VKO - VSyr) * (1 + EvapK/(100-EvapK)) */
export function kettleFullVolume(vKO: number, vSyr: number, evapPercent: number): number {
  return (vKO - vSyr) * (1 + evapPercent / (100 - evapPercent));
}
