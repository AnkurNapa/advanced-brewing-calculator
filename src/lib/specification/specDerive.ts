/**
 * Specification derivation orchestrator (Chapter 4 spec engine).
 *
 * Given ANY TWO known analyses, derive the complete fermentation analysis set:
 * RE, ALC (ABW), OG, RDF, AE, SG, ABV, ABV60, RDA, ADA, E/A ratio, ash,
 * calories, protein and carbohydrate.
 *
 * Design: the canonical unknowns are (RE, ALC). Every analysis is a *forward*
 * function of (RE, ALC) computed exclusively through `@/lib/engine` — this
 * module never re-derives any brewing equation, it only inverts the forward
 * maps numerically (2-D Newton–Raphson) or, for the documented OG+RDF pair,
 * uses the engine's closed-form REx/ALx (which also carry tolerance
 * propagation via their t=2 branch).
 *
 * Source of behaviour: the calculations reference §13–19
 * and 01_Functional_Spec.md §2. Pure + immutable — no React, no mutation.
 */

import {
  REx,
  ALx,
  ogFromReAlc,
  rdfFromReAlc,
  SGBeer,
  SGBeerx,
  fAE,
  abv,
  dAbv,
  abv60,
  SGA60,
  eaRatio,
  rda,
  ada,
  ashPercent,
  DEFAULT_ASH_PERCENT,
  caloriesPer12FlOz,
  proteinPer12FlOz,
  carbsPer12FlOz,
} from '@/lib/engine';

/** The analyses a brewer can measure and enter directly. */
export type AnalysisKey = 'OG' | 'RDF' | 'RE' | 'ALC' | 'AE' | 'SG' | 'ABV';

export interface AnalysisMeta {
  /** Full human label. */
  label: string;
  /** Compact symbol (used in tiles / selects). */
  short: string;
  /** Display unit suffix ('' for the dimensionless beer SG). */
  unit: string;
  /** One-line explanation. */
  hint: string;
  /** Value pre-filled when this analysis is first selected. */
  defaultValue: number;
  /** Sensible input step. */
  step: number;
  min: number;
  max: number;
}

/**
 * Display + input metadata for every selectable analysis. Defaults are the
 * KB worked example (OG=13.0, RDF=64.9 → RE=4.771, ALC=4.269, SG≈1.0109).
 */
export const ANALYSIS_META: Record<AnalysisKey, AnalysisMeta> = {
  OG: {
    label: 'Original Gravity',
    short: 'OG',
    unit: '°P',
    hint: 'Extract of the original wort, °Plato (% w/w).',
    defaultValue: 13.0,
    step: 0.1,
    min: 0.1,
    max: 40,
  },
  RDF: {
    label: 'Real Degree of Fermentation',
    short: 'RDF',
    unit: '%',
    hint: 'Fraction of real extract fermented (% w/w).',
    defaultValue: 64.9,
    step: 0.1,
    min: 1,
    max: 99,
  },
  RE: {
    label: 'Real Extract',
    short: 'RE',
    unit: '°P',
    hint: 'Dealcoholised (true) extract remaining, °Plato.',
    defaultValue: 4.771,
    step: 0.01,
    min: 0.1,
    max: 30,
  },
  ALC: {
    label: 'Alcohol (ABW)',
    short: 'ABW',
    unit: '% w/w',
    hint: 'Alcohol by weight, % w/w.',
    defaultValue: 4.269,
    step: 0.01,
    min: 0.1,
    max: 15,
  },
  AE: {
    label: 'Apparent Extract',
    short: 'AE',
    unit: '°P',
    hint: 'Hydrometer/Plato reading of the finished beer.',
    defaultValue: 2.6,
    step: 0.01,
    min: -2,
    max: 20,
  },
  SG: {
    label: 'Beer Specific Gravity',
    short: 'SG',
    unit: '',
    hint: 'Density of the finished beer relative to water.',
    defaultValue: 1.0109,
    step: 0.0001,
    min: 0.98,
    max: 1.15,
  },
  ABV: {
    label: 'Alcohol by Volume',
    short: 'ABV',
    unit: '% vol',
    hint: 'Alcohol by volume at 20 °C, % vol.',
    defaultValue: 5.46,
    step: 0.01,
    min: 0.1,
    max: 20,
  },
};

/** Assumed malt-extract fraction for the protein/carb estimate when unknown. */
export const DEFAULT_MALT_EXTRACT_PERCENT = 97;

export interface KnownAnalysis {
  key: AnalysisKey;
  value: number;
  /** Optional ± measurement uncertainty (propagated for the OG+RDF pair). */
  tolerance?: number;
}

export interface SpecTolerances {
  dOG?: number;
  dRDF?: number;
  dRE?: number;
  dALC?: number;
  dSG?: number;
  dABV?: number;
}

export interface DerivedSpec {
  RE: number;
  ALC: number;
  ABW: number;
  OG: number;
  RDF: number;
  AE: number;
  SG: number;
  ABV: number;
  ABV60: number;
  RDA: number;
  ADA: number;
  EA: number;
  ash: number;
  calories: number;
  protein: number;
  carbs: number;
  /** How (RE, ALC) was recovered: 'closed-form' (OG+RDF) or 'numeric'. */
  method: 'closed-form' | 'numeric';
  tolerances?: SpecTolerances;
}

export type DeriveResult =
  | { ok: true; spec: DerivedSpec }
  | { ok: false; reason: string };

// ---------------------------------------------------------------------------
// Forward prediction — every analysis as a function of the (RE, ALC) unknowns.
// All maths delegated to the engine; nothing is re-derived here.
// ---------------------------------------------------------------------------

function predict(key: AnalysisKey, re: number, alc: number): number {
  switch (key) {
    case 'RE':
      return re;
    case 'ALC':
      return alc;
    case 'OG':
      return ogFromReAlc(re, alc);
    case 'RDF':
      return rdfFromReAlc(re, alc);
    case 'SG':
      return SGBeer(re, alc);
    case 'AE':
      return fAE(SGBeer(re, alc));
    case 'ABV':
      return abv(alc, SGBeer(re, alc));
    default:
      return Number.NaN;
  }
}

/** SG and AE are the same physical measurement — this pair is under-determined. */
export function isRedundantPair(a: AnalysisKey, b: AnalysisKey): boolean {
  if (a === b) return true;
  const pair = new Set([a, b]);
  return pair.has('SG') && pair.has('AE');
}

// ---------------------------------------------------------------------------
// Seeding + 2-D Newton solve for (RE, ALC).
// ---------------------------------------------------------------------------

const RE_DOMAIN = { min: 0.05, max: 40 };
const ALC_DOMAIN = { min: 0.01, max: 20 };

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

/** Build a starting guess for (RE, ALC) from whatever the two knowns are. */
function seedReAlc(inputs: KnownAnalysis[]): { re: number; alc: number } {
  const byKey = new Map(inputs.map((i) => [i.key, i.value]));
  let re = 4.5;
  let alc = 4;

  if (byKey.has('RE')) re = byKey.get('RE')!;
  else if (byKey.has('AE')) re = byKey.get('AE')! * 1.15 + 0.5;
  else if (byKey.has('SG')) re = fAE(byKey.get('SG')!) * 1.15 + 0.5;
  else if (byKey.has('OG')) re = byKey.get('OG')! * 0.36;

  if (byKey.has('ALC')) alc = byKey.get('ALC')!;
  else if (byKey.has('ABV')) alc = byKey.get('ABV')! * 0.79;
  else if (byKey.has('OG')) alc = byKey.get('OG')! * 0.33;
  else if (byKey.has('RDF') && byKey.has('RE')) alc = Math.max(byKey.get('RE')! * 0.9, 0.5);

  return {
    re: clamp(re, RE_DOMAIN.min, RE_DOMAIN.max),
    alc: clamp(alc, ALC_DOMAIN.min, ALC_DOMAIN.max),
  };
}

function solveReAlc(
  inputs: KnownAnalysis[],
): { re: number; alc: number } | null {
  const [a, b] = inputs;
  const seed = seedReAlc(inputs);
  let re = seed.re;
  let alc = seed.alc;
  const h = 1e-6;

  const residuals = (r: number, al: number): [number, number] => [
    predict(a.key, r, al) - a.value,
    predict(b.key, r, al) - b.value,
  ];

  for (let iter = 0; iter < 120; iter += 1) {
    const [r1, r2] = residuals(re, alc);
    if (Math.abs(r1) + Math.abs(r2) < 1e-11) {
      return { re, alc };
    }

    // Central-difference Jacobian of [f_a, f_b] w.r.t. [re, alc].
    const j11 = (predict(a.key, re + h, alc) - predict(a.key, re - h, alc)) / (2 * h);
    const j12 = (predict(a.key, re, alc + h) - predict(a.key, re, alc - h)) / (2 * h);
    const j21 = (predict(b.key, re + h, alc) - predict(b.key, re - h, alc)) / (2 * h);
    const j22 = (predict(b.key, re, alc + h) - predict(b.key, re, alc - h)) / (2 * h);

    const det = j11 * j22 - j12 * j21;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-14) break;

    const dRe = (r1 * j22 - r2 * j12) / det;
    const dAlc = (j11 * r2 - j21 * r1) / det;
    if (!Number.isFinite(dRe) || !Number.isFinite(dAlc)) break;

    // Damped step, clamped to the physical domain.
    re = clamp(re - dRe, RE_DOMAIN.min, RE_DOMAIN.max);
    alc = clamp(alc - dAlc, ALC_DOMAIN.min, ALC_DOMAIN.max);
  }

  const [r1, r2] = residuals(re, alc);
  if (Math.abs(r1) + Math.abs(r2) < 1e-6) return { re, alc };
  return null;
}

// ---------------------------------------------------------------------------
// Full derivation.
// ---------------------------------------------------------------------------

function assemble(
  re: number,
  alc: number,
  method: DerivedSpec['method'],
  tolerances?: SpecTolerances,
): DerivedSpec {
  const og = ogFromReAlc(re, alc);
  const rdf = rdfFromReAlc(re, alc);
  const sg = SGBeer(re, alc);
  const ae = fAE(sg);
  const abvVal = abv(alc, sg);
  const ash = DEFAULT_ASH_PERCENT;
  const protein = proteinPer12FlOz(DEFAULT_MALT_EXTRACT_PERCENT, og);

  return {
    RE: re,
    ALC: alc,
    ABW: alc,
    OG: og,
    RDF: rdf,
    AE: ae,
    SG: sg,
    ABV: abvVal,
    ABV60: abv60(alc, SGA60(alc), SGA60(100)),
    RDA: rda(re, og),
    ADA: ada(ae, og),
    EA: eaRatio(rdf),
    ash,
    calories: caloriesPer12FlOz(alc, re, ash, sg),
    protein,
    carbs: carbsPer12FlOz(re, ash, sg, protein),
    method,
    tolerances,
  };
}

function isValid(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Derive the full analysis set from exactly two known analyses.
 * Returns a discriminated result so callers can render errors without throwing.
 */
export function deriveSpec(inputs: KnownAnalysis[]): DeriveResult {
  if (inputs.length !== 2) {
    return { ok: false, reason: 'Pick exactly two analyses to derive from.' };
  }
  const [a, b] = inputs;
  if (!isValid(a.value) || !isValid(b.value)) {
    return { ok: false, reason: 'Enter a value for both analyses.' };
  }
  if (isRedundantPair(a.key, b.key)) {
    return {
      ok: false,
      reason:
        a.key === b.key
          ? 'Choose two different analyses.'
          : 'Beer SG and apparent extract are the same measurement — pick another pair.',
    };
  }

  // Documented closed-form path: OG + RDF via the engine's REx/ALx, which also
  // carry KB uncertainty propagation on their t=2 branch.
  const byKey = new Map(inputs.map((i) => [i.key, i]));
  if (byKey.has('OG') && byKey.has('RDF')) {
    const og = byKey.get('OG')!;
    const rdf = byKey.get('RDF')!;
    const dOG = og.tolerance ?? 0;
    const dRDF = rdf.tolerance ?? 0;
    const re = REx(og.value, dOG, rdf.value, dRDF, 1);
    const alc = ALx(og.value, dOG, rdf.value, dRDF, 1);
    if (!Number.isFinite(re) || !Number.isFinite(alc) || re <= 0 || alc <= 0) {
      return { ok: false, reason: 'Those OG/RDF values do not resolve to a real beer.' };
    }

    let tolerances: SpecTolerances | undefined;
    if (dOG > 0 || dRDF > 0) {
      const dRE = REx(og.value, dOG, rdf.value, dRDF, 2);
      const dALC = ALx(og.value, dOG, rdf.value, dRDF, 2);
      const sg = SGBeer(re, alc);
      const dSG = SGBeerx(og.value, dOG, rdf.value, dRDF, 2);
      tolerances = {
        dOG,
        dRDF,
        dRE,
        dALC,
        dSG,
        dABV: dAbv(alc, dALC, sg, dSG),
      };
    }
    return { ok: true, spec: assemble(re, alc, 'closed-form', tolerances) };
  }

  const solved = solveReAlc(inputs);
  if (!solved) {
    return {
      ok: false,
      reason: 'No physical beer matches those two values — check the inputs.',
    };
  }
  return { ok: true, spec: assemble(solved.re, solved.alc, 'numeric') };
}
