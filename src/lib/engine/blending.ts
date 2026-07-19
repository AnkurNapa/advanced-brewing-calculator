/**
 * Blending — two beers by volume fraction (Fig 2.05).
 * Source: MasterBrewers_KB/04_Calculations_Reference.md §19.
 */

import { lbbl, P } from './gravity';

/**
 * OGb = P( V1*lbbl(OG1)/100 + (100-V1)*lbbl(OG2)/100 )
 */
export function blendedOG(og1: number, og2: number, v1: number): number {
  return P((v1 * lbbl(og1)) / 100 + ((100 - v1) * lbbl(og2)) / 100);
}

/**
 * RDFpp (blend) = (RDF1*lbbl(OG1)*V1/100 + RDF2*lbbl(OG2)*(100-V1)/100)
 *                 / (V1*lbbl(OG1)/100 + (100-V1)*lbbl(OG2)/100)
 */
export function blendedRDF(og1: number, rdf1: number, og2: number, rdf2: number, v1: number): number {
  const numerator = (rdf1 * lbbl(og1) * v1) / 100 + (rdf2 * lbbl(og2) * (100 - v1)) / 100;
  const denominator = (v1 * lbbl(og1)) / 100 + ((100 - v1) * lbbl(og2)) / 100;
  return numerator / denominator;
}

/** Pre-primed adjust factor: adjb = lbbl(OG1a)/lbbl(OG1) */
export function preprimedAdjustFactor(og1a: number, og1: number): number {
  return lbbl(og1a) / lbbl(og1);
}

/**
 * Blend a scalar value (color, IBU, pH-linearizable) by volume fraction:
 * Target = ((Beer1 val)*v1c + (Beer2 val)*(100-v1c))/(100*adjb) + blendExtra
 */
export function blendedScalar(
  beer1Value: number,
  beer2Value: number,
  v1c: number,
  adjb = 1,
  blendExtra = 0
): number {
  return (beer1Value * v1c + beer2Value * (100 - v1c)) / (100 * adjb) + blendExtra;
}

/**
 * pH blended via [H+]: Target pH = -log10(10^(-pH1)*v1c/100 + 10^(-pH2)*(100-v1c)/100)
 */
export function blendedPH(ph1: number, ph2: number, v1c: number): number {
  const hConcentration = (10 ** -ph1 * v1c) / 100 + (10 ** -ph2 * (100 - v1c)) / 100;
  return -Math.log10(hConcentration);
}
