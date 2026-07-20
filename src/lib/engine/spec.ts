/**
 * Chapter 4 spec engine: RDF/OG/E-A/RDA/ADA, ABV, ash, calories, protein, carbs.
 * Source: the calculations reference §13, §19.
 * Worked at RE=4.771, ALC=4.269, OG=13.0, RDF=64.9.
 */

const BALLING_FACTOR = 2.0665;

/** RDF %w/w = 100 * 2.0665 / (2.0665 + RE/Alc) */
export function rdfFromReAlc(re: number, alc: number): number {
  return (100 * BALLING_FACTOR) / (BALLING_FACTOR + re / alc);
}

/** d(RDF) = |(dRE/RE - dAlc/Alc) * (1 - RDF/100) * RDF / (1 - 2*RE/OG)| */
export function dRdf(re: number, dRe: number, alc: number, dAlc: number, rdf: number, og: number): number {
  return Math.abs(((dRe / re - dAlc / alc) * (1 - rdf / 100) * rdf) / (1 - (2 * re) / og));
}

/** OG %w/w = 100 * (2.0665*Alc + RE) / (100 + 1.0665*Alc) */
export function ogFromReAlc(re: number, alc: number): number {
  return (100 * (BALLING_FACTOR * alc + re)) / (100 + (BALLING_FACTOR - 1) * alc);
}

/** d(OG) = |(dRE/RE*(1-RDF/100) - dRDF/RDF*(1-RE/OG)) * OG^2 / RE| */
export function dOg(re: number, dRe: number, rdf: number, dRdfValue: number, og: number): number {
  return Math.abs(
    ((dRe / re) * (1 - rdf / 100) - (dRdfValue / rdf) * (1 - re / og)) * (og ** 2 / re)
  );
}

/** OGV %w/v = OG * SG (weight/volume variant) */
export function ogv(og: number, sg: number): number {
  return og * sg;
}

/** E/A ratio = 206.65/RDF - 2.0665 (range 0.5-1.5 <=> RDF 80.5-57.9) */
export function eaRatio(rdf: number): number {
  return 206.65 / rdf - BALLING_FACTOR;
}

/** RDA = 100 * (1 - RE/OG) — real degree of attenuation. */
export function rda(re: number, og: number): number {
  return 100 * (1 - re / og);
}

/** ADA = 100 * (1 - AE/OG) — apparent degree of attenuation. */
export function ada(ae: number, og: number): number {
  return 100 * (1 - ae / og);
}

/** ABV (68F/20C) = ALC * SGbeer / 0.79066 */
export function abv(alc: number, sgBeer: number): number {
  return (alc * sgBeer) / 0.79066;
}

/** d(ABV) = (ALC*d(SGbeer) + d(ALC)*SGbeer) / 0.79066 */
export function dAbv(alc: number, dAlc: number, sgBeer: number, dSgBeer: number): number {
  return (alc * dSgBeer + dAlc * sgBeer) / 0.79066;
}

/** ABV at 60F/15.56C: ABV60 = ABWdistillate * SGa60(ABWdistillate)/SGa60(100) */
export function abv60(abwDistillate: number, sga60Abw: number, sga60At100: number): number {
  return (abwDistillate * sga60Abw) / sga60At100;
}

/** Ash %w/w = 1.43e-4 * (%MaltExtract) * OG (default 0.19 if unknown) */
export function ashPercent(percentMaltExtract: number, og: number): number {
  return 1.43e-4 * percentMaltExtract * og;
}

export const DEFAULT_ASH_PERCENT = 0.19;

/** Calories/12floz = (6.9*ALC + 4*(RE - Ash)) * SG * 3.55 */
export function caloriesPer12FlOz(alc: number, re: number, ash: number, sg: number): number {
  return (6.9 * alc + 4 * (re - ash)) * sg * 3.55;
}

/** Protein g/12floz = 3.1e-4 * 5 * (%MaltExtract) * OG (estimate when unknown) */
export function proteinPer12FlOz(percentMaltExtract: number, og: number): number {
  return 3.1e-4 * 5 * percentMaltExtract * og;
}

/** Carb g/12floz = (RE - Ash) * SG * 3.55 - protein */
export function carbsPer12FlOz(re: number, ash: number, sg: number, protein: number): number {
  return (re - ash) * sg * 3.55 - protein;
}

/**
 * PRC RDF (Package Release Cellar) = 206.65 / (2.0665 + RE/ALC), with RE/ALC recomputed
 * after prime addition (caller supplies the post-prime RE/ALC).
 */
export function prcRdf(re: number, alc: number): number {
  return 206.65 / (BALLING_FACTOR + re / alc);
}

/** Expansion factor pure sucrose: PrimeAdj = 1/(1 - %w/w prime * SGPRC/155.52) */
export function primeAdjSucrose(percentWwPrime: number, sgPrc: number): number {
  return 1 / (1 - (percentWwPrime * sgPrc) / 155.52);
}
