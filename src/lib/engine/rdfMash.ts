/**
 * Mash RDF & Estimated Mash RDF.
 * Source: the calculations reference §10.
 *
 * The full Brandam (2003) enzymatic-hydrolysis kinetic model (RK4 at 1-min steps,
 * gelatinization + alpha/beta-amylase denaturation + starch/dextrin -> sugars, with
 * rate constants on the calculations reference pp.47-49) is NOT implemented here.
 * TODO: implement the full RK4 simulation for `estimatedMashRDF` precision mode;
 * for now only the documented regression fallback is implemented, per the design spec's
 * "regression fallback may be a documented TODO stub" allowance.
 */

/** Formula Fermentable Syrup: FFSyr = Sum(%ofExtract * %fermentables)/100 */
export function formulaFermentableSyrup(lines: { percentOfExtract: number; percentFermentables: number }[]): number {
  return lines.reduce((sum, l) => sum + (l.percentOfExtract * l.percentFermentables) / 100, 0);
}

/** Formula Malt: FMalt = Sum(%ofExtract for malt lines) */
export function formulaMalt(maltPercentOfExtract: number[]): number {
  return maltPercentOfExtract.reduce((a, b) => a + b, 0);
}

/** Formula Grits: FGrits = Sum(%ofExtract for grits lines) */
export function formulaGrits(gritsPercentOfExtract: number[]): number {
  return gritsPercentOfExtract.reduce((a, b) => a + b, 0);
}

/**
 * Mash RDF = (Fermenter RDF - FFSyr) * 100 / (FMalt + FGrits)
 */
export function mashRDF(fermenterRDF: number, ffSyr: number, fMalt: number, fGrits: number): number {
  return ((fermenterRDF - ffSyr) * 100) / (fMalt + fGrits);
}

/**
 * Estimated Mash RDF — regression fallback from preliminary RDF + malt color.
 * estRDF = 36.78 + 0.3799*RDF - 0.1031*Color (adj R^2 ~ 0.91)
 *
 * This is a documented approximation of the full Brandam kinetic model (RK4 simulation),
 * which is not yet implemented — see the module-level TODO.
 */
export function estimatedMashRDFRegression(rdf: number, color: number): number {
  return 36.78 + 0.3799 * rdf - 0.1031 * color;
}
