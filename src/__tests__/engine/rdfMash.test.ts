import { describe, it, expect } from 'vitest';
import {
  formulaFermentableSyrup,
  formulaMalt,
  formulaGrits,
  mashRDF,
  estimatedMashRDFRegression,
} from '@/lib/engine/rdfMash';

describe('rdfMash engine', () => {
  it('matches the KB worked example: FFSyr=2.85, FMalt=97, FGrits=0, MashRDF=61.9', () => {
    const ffSyr = formulaFermentableSyrup([{ percentOfExtract: 3, percentFermentables: 95 }]);
    expect(ffSyr).toBeCloseTo(2.85, 2);

    const fMalt = formulaMalt([97]);
    expect(fMalt).toBe(97);

    const fGrits = formulaGrits([]);
    expect(fGrits).toBe(0);

    const rdf = mashRDF(62.9, ffSyr, fMalt, fGrits);
    expect(rdf).toBeCloseTo(61.9, 1);
  });

  it('regression: estRDF = 36.78 + 0.3799*RDF - 0.1031*Color (KB correctness gate)', () => {
    const rdf = 61.9;
    const color = 10;
    const est = estimatedMashRDFRegression(rdf, color);
    expect(est).toBeCloseTo(36.78 + 0.3799 * rdf - 0.1031 * color, 6);
  });

  it('is a pure linear function (sanity: increasing RDF increases estimate)', () => {
    expect(estimatedMashRDFRegression(70, 10)).toBeGreaterThan(estimatedMashRDFRegression(60, 10));
    expect(estimatedMashRDFRegression(60, 20)).toBeLessThan(estimatedMashRDFRegression(60, 10));
  });
});
