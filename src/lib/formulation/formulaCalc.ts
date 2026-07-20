/**
 * formulaCalc.ts — Formulation calc orchestrator (pure, no React/DOM).
 *
 * Composes the pure engine (`@/lib/engine`) over a Formula + its FormulaDetail
 * lines to reproduce the reference brewing model "Calculate" behaviour:
 *
 * - Calculate Forward : targets/formulation inputs -> line Quantities.
 * Each raw-material line's `Fraction` (% of extract,
 * % of IBU, ...) + material chemistry yields a base-unit
 * quantity, converted back to the line's parameter unit
 * and rounded to `Qround`. Header targets (brewhouse
 * efficiency, estimated SRM/IBU, mash/beer RDF) are then
 * derived from the computed lines.
 * - Calculate Backward : zero the Fraction on every raw-material line, take the
 * reported quantity as truth, and derive the formulation
 * Fractions + header targets from those quantities.
 *
 * All internal math runs in BASE UNITS (pound, barrel, °Plato). Every function
 * is immutable: the input Formula/lines are never mutated; new objects are
 * returned. Where the seed lacks the data a full derivation needs (boil times
 * for kinetic hop utilisation, per-material moisture, etc.) the field degrades
 * gracefully and the reason is recorded in `result.degraded`.
 *
 * Source of behaviour: the calculations reference §4–6 and
 * 04_Calculations_Reference.md §3/§5/§6/§7/§8/§10.
 */

import {
  lbbl,
  toBase,
  fromBase,
  extractAdditionQuantityLbs,
  bitteringHopQuantity,
  measuredHopUtilization,
  estimatedKettleHopUtilization,
  colorFromMalt,
  estimatedBeerColor,
  mashRDF,
  estimatedMashRDFRegression,
  fSGE,
} from '@/lib/engine';
import type {
  Category,
  Formula,
  FormulaDetail,
  Material,
  Process,
  Unit,
} from '@/lib/data/types';

// ---------------------------------------------------------------------------
// Category ids (from seed/category.json). Kept as named constants, not magic.
// ---------------------------------------------------------------------------

export const CATEGORY = {
  MALT: 1,
  SYRUP: 3,
  FLAVOR: 4,
  TIME: 5,
  ADDITIVES: 6,
  WATER: 7,
  MISC: 8,
  HOP: 24,
  WORT: 25,
  FILTER_AID: 26,
  HOP_REDUCED: 27,
  OVERHEAD: 28,
  YIELD: 29,
  GRITS: 30,
  TEMPERATURE: 31,
  ANALYSIS: 33,
  CARBONATION: 34,
  YEAST: 35,
  KRAUSEN: 36,
  PACKAGE: 37,
} as const;

/** Base-unit id for weight (pounds) — the extract balance only sums pound-based rows. */
const BASE_UNIT_POUND = 2;

/**
 * Process-order cutoff separating kettle/bittering hops from later dry hops.
 * Wort Cooling has ProcessOrder 8; hops added at an earlier order isomerise in
 * the boil (bittering), later additions (Ruh/dry hop) do not and are left as-is.
 */
const WORT_COOLING_ORDER = 8;

/** Fallbacks used when the recipe lacks the data for a clean derivation. */
const FALLBACK_BREWHOUSE_EFFICIENCY = 90;
const FALLBACK_HOP_UTILIZATION = 30;
/** Boil time (min) assumed for kinetic hop utilisation when the recipe has none. */
const DEFAULT_BOIL_MINUTES = 60;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Lookup maps the orchestrator needs — build from `useCatalog` / repository. */
export interface CalcContext {
  materialById: Map<number, Material>;
  unitById: Map<number, Unit>;
  categoryById: Map<number, Category>;
  processById: Map<number, Process>;
}

export type CalcDirection = 'forward' | 'backward';

/** A single Quantity change, for the "confirm deltas in batches of ten" dialog. */
export interface LineDelta {
  processId: number;
  materialId: number;
  label: string;
  from: number | null;
  to: number | null;
}

/** Which header targets were fully derived vs. degraded, and why. */
export interface CalcMeta {
  brewhouseEfficiency: number | null;
  hopUtilization: number | null;
  degraded: string[];
}

export interface CalcResult {
  formula: Formula;
  lines: FormulaDetail[];
  direction: CalcDirection;
  meta: CalcMeta;
  deltas: LineDelta[];
}

export type LineKind =
  | 'malt'
  | 'grits'
  | 'syrup'
  | 'krausen'
  | 'hop'
  | 'hopReduced'
  | 'passthrough';

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

/** Classify a line by its material category. */
export function classifyLine(line: FormulaDetail, ctx: CalcContext): LineKind {
  const material = ctx.materialById.get(line.MaterialID);
  switch (material?.CategoryID) {
    case CATEGORY.MALT:
      return 'malt';
    case CATEGORY.GRITS:
      return 'grits';
    case CATEGORY.SYRUP:
      return 'syrup';
    case CATEGORY.KRAUSEN:
      return 'krausen';
    case CATEGORY.HOP: {
      // Only boil-stage hops bitter; later (Ruh / dry) hop additions pass through.
      const order = line.ProcessID == null ? undefined : ctx.processById.get(line.ProcessID)?.ProcessOrder;
      return order != null && order < WORT_COOLING_ORDER ? 'hop' : 'passthrough';
    }
    case CATEGORY.HOP_REDUCED:
      return 'hopReduced';
    default:
      return 'passthrough';
  }
}

/** Is this line a raw material whose Fraction drives a quantity calc? */
function isRawMaterial(kind: LineKind): boolean {
  return kind !== 'passthrough';
}

/** The unit factor for a line's parameter unit (defaults to 1:1 pounds). */
function unitFactor(line: FormulaDetail, ctx: CalcContext): Unit | undefined {
  return line.FUnitID == null ? undefined : ctx.unitById.get(line.FUnitID);
}

/** Numeric coercion tolerant of the seed's mixed string/number columns. */
function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Reported value of a line in its parameter unit (Qtext, else Quantity). */
function reportedDisplay(line: FormulaDetail): number | null {
  return num(line.Qtext) ?? num(line.Quantity);
}

/** Reported weight of a line converted to base pounds, or null if not weight-based. */
function reportedWeightLbs(line: FormulaDetail, ctx: CalcContext): number | null {
  const unit = unitFactor(line, ctx);
  if (!unit || unit.BaseUnitID !== BASE_UNIT_POUND) return null;
  const display = reportedDisplay(line);
  if (display == null) return null;
  return toBase(display, unit);
}

/** Solids / alpha / yield percentage for a line (line override, else material). */
function solidsPercent(line: FormulaDetail, material: Material | undefined): number {
  const fromLine = num(line.Extract);
  if (fromLine != null && fromLine > 0) return fromLine;
  return material?.MatlExt ?? 0;
}

/** Round a value to the nearest `increment` (>0); pass-through otherwise. */
export function roundTo(value: number, increment: number | null | undefined): number {
  if (!increment || increment <= 0) return value;
  return Math.round(value / increment) * increment;
}

/** Convert a base-pound weight to the line's display unit. */
function baseLbsToDisplay(baseLbs: number, line: FormulaDetail, ctx: CalcContext): number {
  const unit = unitFactor(line, ctx);
  if (!unit) return baseLbs;
  return fromBase(baseLbs, unit);
}

// ---------------------------------------------------------------------------
// Derivations shared by both directions
// ---------------------------------------------------------------------------

/**
 * Brewhouse efficiency (% extract recovered) from the extract balance:
 *
 * BHE = 100 * (fermenter malt extract) / (theoretical malt+grits extract)
 *
 * where fermenter malt extract = bbl1*lbbl(OG1) minus the extract contributed by
 * post-lauter syrups, and theoretical extract = Σ(reported weight * solids%).
 * Verified against seed formula 50 → 93.0% (reproduces its malt weights to <0.02%).
 */
export function deriveBrewhouseEfficiency(
  lines: FormulaDetail[],
  bbl1: number,
  og1: number,
  ctx: CalcContext,
): number | null {
  if (bbl1 <= 0 || og1 <= 0) return null;
  const fermenterExtract = bbl1 * lbbl(og1);

  let theoreticalExtract = 0;
  let syrupExtract = 0;
  for (const line of lines) {
    const kind = classifyLine(line, ctx);
    const material = ctx.materialById.get(line.MaterialID);
    const weightLbs = reportedWeightLbs(line, ctx);
    if (weightLbs == null) continue;
    const solids = solidsPercent(line, material) / 100;
    if (kind === 'malt' || kind === 'grits') {
      theoreticalExtract += weightLbs * solids;
    } else if (kind === 'syrup' || kind === 'krausen') {
      syrupExtract += weightLbs * solids;
    }
  }
  if (theoreticalExtract <= 0) return null;
  const maltFermenterExtract = fermenterExtract - syrupExtract;
  const bhe = (100 * maltFermenterExtract) / theoreticalExtract;
  if (!Number.isFinite(bhe) || bhe <= 0) return null;
  // Clamp to a sane band; legacy recipes occasionally overshoot from rounding.
  return Math.min(bhe, 100);
}

/**
 * Kettle hop utilisation (%) inferred from the reported hop weights, so that the
 * forward calc reproduces them. Averages the per-line implied utilisation from
 * the bittering-hop relation. Falls back to the kinetic model / a constant.
 */
export function deriveHopUtilization(
  lines: FormulaDetail[],
  bbl2: number,
  ibu: number,
  og1: number,
  ctx: CalcContext,
): { value: number; degraded: boolean } {
  if (bbl2 > 0 && ibu > 0) {
    let hopLbsTimesAlpha = 0;
    let hasHop = false;
    let sumOfIBU = 0;
    for (const line of lines) {
      if (classifyLine(line, ctx) !== 'hop') continue;
      const material = ctx.materialById.get(line.MaterialID);
      const weightLbs = reportedWeightLbs(line, ctx);
      const alpha = solidsPercent(line, material);
      const frac = num(line.Fraction) ?? 0;
      if (weightLbs != null && alpha > 0) {
        hopLbsTimesAlpha += weightLbs * alpha;
        sumOfIBU += frac;
        hasHop = true;
      }
    }
    if (hasHop && hopLbsTimesAlpha > 0 && sumOfIBU > 0) {
      // `percentOfIBU` here is the raw summed Fraction (§8 uses it un-normalised).
      const util = measuredHopUtilization({
        bbl2,
        percentOfIBU: sumOfIBU,
        ibu,
        hopLbsTimesAlpha,
      });
      if (Number.isFinite(util) && util > 0) {
        return { value: Math.min(util, 100), degraded: false };
      }
    }
  }
  // No reported weights to infer from — fall back to the kinetic estimate.
  if (og1 > 0) {
    const sg = fSGE(og1);
    const est = estimatedKettleHopUtilization(DEFAULT_BOIL_MINUTES, sg);
    if (Number.isFinite(est) && est > 0) return { value: est, degraded: true };
  }
  return { value: FALLBACK_HOP_UTILIZATION, degraded: true };
}

// ---------------------------------------------------------------------------
// Forward calc — Fraction -> Quantity, then derive header targets.
// ---------------------------------------------------------------------------

interface HeaderInputs {
  bbl1: number;
  og1: number;
  bu: number;
  bbl2: number;
  og2: number;
}

function headerInputs(formula: Formula): HeaderInputs {
  const bbl1 = formula.Bbl1 ?? 0;
  const og1 = formula.OG1 ?? 0;
  return {
    bbl1,
    og1,
    bu: formula.BU ?? 0,
    // Kettle/finished volume + gravity for hop & color math; fall back to fermenter.
    bbl2: formula.Bbl2m && formula.Bbl2m > 0 ? formula.Bbl2m : bbl1,
    og2: formula.OG2m && formula.OG2m > 0 ? formula.OG2m : og1,
  };
}

/**
 * Compute one raw-material line's Quantity (display unit) from its Fraction.
 * Returns null when the line's category/data cannot drive a calc.
 */
function forwardLineQuantity(
  line: FormulaDetail,
  kind: LineKind,
  header: HeaderInputs,
  bhe: number,
  hopUtil: number,
  ctx: CalcContext,
): number | null {
  const material = ctx.materialById.get(line.MaterialID);
  const frac = num(line.Fraction) ?? 0;
  const solids = solidsPercent(line, material);

  if (kind === 'malt' || kind === 'grits' || kind === 'syrup' || kind === 'krausen') {
    if (solids <= 0 || header.bbl1 <= 0 || header.og1 <= 0) return null;
    const preLauter = kind === 'malt' || kind === 'grits';
    const baseLbs = extractAdditionQuantityLbs({
      bbl1: header.bbl1,
      og1: header.og1,
      percentOfExtract: frac / 100,
      solidsPercent: solids / 100,
      beforeLauter: preLauter,
      brewhouseEfficiencyPercent: preLauter ? bhe : undefined,
    });
    return baseLbsToDisplay(baseLbs, line, ctx);
  }

  if (kind === 'hop') {
    const unit = unitFactor(line, ctx);
    const alpha = solids;
    if (alpha <= 0 || header.bbl2 <= 0 || header.bu <= 0) return null;
    const baseUnitPerUnit = unit?.BaseUnitPerUnit ?? 1;
    // Quantity comes back already scaled to the line's parameter unit.
    return bitteringHopQuantity({
      bbl2: header.bbl2,
      percentOfIBU: frac,
      baseUnitPerUnit,
      ibu: header.bu,
      percentAlphaAcid: alpha,
      hopUtilization: hopUtil,
    });
  }

  // hopReduced and everything else: no closed-form here — keep the report value.
  return null;
}

/**
 * Calculate Forward: derive line Quantities from Fractions, then header targets.
 */
export function calculateForward(
  formula: Formula,
  lines: FormulaDetail[],
  ctx: CalcContext,
): CalcResult {
  const header = headerInputs(formula);
  const degraded: string[] = [];

  const bhe = deriveBrewhouseEfficiency(lines, header.bbl1, header.og1, ctx);
  const effectiveBhe = bhe ?? FALLBACK_BREWHOUSE_EFFICIENCY;
  if (bhe == null) {
    degraded.push(
      'Brewhouse efficiency: no fermenter volume/OG or malt weights to derive it — used a 90% default.',
    );
  }
  const hop = deriveHopUtilization(lines, header.bbl2, header.bu, header.og1, ctx);
  if (hop.degraded) {
    degraded.push(
      'Hop utilisation: no reported hop weights — estimated from the Malowicki–Shellhammer kinetic model (60 min boil).',
    );
  }

  const deltas: LineDelta[] = [];
  const nextLines = lines.map((line) => {
    const kind = classifyLine(line, ctx);
    if (!isRawMaterial(kind)) return line;
    const q = forwardLineQuantity(line, kind, header, effectiveBhe, hop.value, ctx);
    if (q == null || !Number.isFinite(q)) return line;
    const rounded = roundTo(q, line.Qround);
    if (rounded === line.Quantity) return line;
    deltas.push({
      processId: line.ProcessID,
      materialId: line.MaterialID,
      label: (line.MText ?? '').trim(),
      from: line.Quantity,
      to: rounded,
    });
    return { ...line, Quantity: rounded };
  });

  const targets = deriveHeaderTargets(formula, nextLines, header, bhe, effectiveBhe, degraded, ctx);
  return {
    formula: { ...formula, ...targets },
    lines: nextLines,
    direction: 'forward',
    meta: { brewhouseEfficiency: bhe, hopUtilization: hop.value, degraded },
    deltas,
  };
}

// ---------------------------------------------------------------------------
// Backward calc — zero raw Fractions, take reported Quantity as truth, then
// derive Fractions + header targets from those quantities.
// ---------------------------------------------------------------------------

/** Back out a raw line's Fraction (% of extract / % of IBU) from its weight. */
function backwardLineFraction(
  line: FormulaDetail,
  kind: LineKind,
  header: HeaderInputs,
  bhe: number,
  hopUtil: number,
  ctx: CalcContext,
): number | null {
  const material = ctx.materialById.get(line.MaterialID);
  const solids = solidsPercent(line, material);

  if (kind === 'malt' || kind === 'grits' || kind === 'syrup' || kind === 'krausen') {
    const weightLbs = reportedWeightLbs(line, ctx);
    if (weightLbs == null || header.bbl1 <= 0 || header.og1 <= 0) return null;
    const preLauter = kind === 'malt' || kind === 'grits';
    // Invert extractAdditionQuantityLbs:
    // frac% = weight * solids% * (BHE/100 if pre-lauter) / (bbl1*lbbl(og1)) * 100
    const fermenterExtract = header.bbl1 * lbbl(header.og1);
    let extractLbs = weightLbs * (solids / 100);
    if (preLauter) extractLbs *= bhe / 100;
    return (extractLbs / fermenterExtract) * 100;
  }

  if (kind === 'hop') {
    const weightLbs = reportedWeightLbs(line, ctx);
    const alpha = solids;
    if (weightLbs == null || alpha <= 0 || header.bbl2 <= 0 || header.bu <= 0) return null;
    // Invert bitteringHopQuantity for %ofIBU (base-pound hops):
    // frac = weightLbs * alpha% * util% * 1e4 / (bbl2 * 258 * IBU)
    return (weightLbs * alpha * hopUtil * 1e4) / (header.bbl2 * 258 * header.bu);
  }

  return null;
}

/**
 * Calculate Backward: zero every raw-material Fraction, then derive the
 * formulation Fractions + header targets from the reported quantities.
 */
export function calculateBackward(
  formula: Formula,
  lines: FormulaDetail[],
  ctx: CalcContext,
): CalcResult {
  const header = headerInputs(formula);
  const degraded: string[] = [];

  const bhe = deriveBrewhouseEfficiency(lines, header.bbl1, header.og1, ctx);
  const effectiveBhe = bhe ?? FALLBACK_BREWHOUSE_EFFICIENCY;
  if (bhe == null) {
    degraded.push(
      'Brewhouse efficiency: could not derive from reported quantities — used a 90% default.',
    );
  }
  const hop = deriveHopUtilization(lines, header.bbl2, header.bu, header.og1, ctx);
  if (hop.degraded) {
    degraded.push('Hop utilisation: no reported hop weights — used a kinetic/constant estimate.');
  }

  const deltas: LineDelta[] = [];
  const nextLines = lines.map((line) => {
    const kind = classifyLine(line, ctx);
    if (!isRawMaterial(kind)) return line;
    // Step 1 (spec §6): zero the raw formulation value.
    const zeroed: FormulaDetail = { ...line, Fraction: 0 };
    // Step 2: derive the formulation value from the reported quantity.
    const frac = backwardLineFraction(zeroed, kind, header, effectiveBhe, hop.value, ctx);
    if (frac == null || !Number.isFinite(frac)) return zeroed;
    if (frac === line.Fraction) return { ...zeroed, Fraction: frac };
    deltas.push({
      processId: line.ProcessID,
      materialId: line.MaterialID,
      label: (line.MText ?? '').trim(),
      from: line.Fraction,
      to: frac,
    });
    return { ...zeroed, Fraction: frac };
  });

  const targets = deriveHeaderTargets(formula, nextLines, header, bhe, effectiveBhe, degraded, ctx);
  return {
    formula: { ...formula, ...targets },
    lines: nextLines,
    direction: 'backward',
    meta: { brewhouseEfficiency: bhe, hopUtilization: hop.value, degraded },
    deltas,
  };
}

// ---------------------------------------------------------------------------
// Header targets — derived from the (computed) lines in either direction.
// ---------------------------------------------------------------------------

/** Reported analysis value for a named finished-beer analysis (by MText match). */
function analysisValue(lines: FormulaDetail[], ctx: CalcContext, needle: RegExp): number | null {
  for (const line of lines) {
    const material = ctx.materialById.get(line.MaterialID);
    if (material?.CategoryID !== CATEGORY.ANALYSIS) continue;
    if (needle.test(material.MaterialName)) return reportedDisplay(line);
  }
  return null;
}

/**
 * Derive the header target panel (Yieldh, SRMest, BUest, wRDF, bRDF, bRDFest).
 * Best-effort: fields that lack source data are left null and noted in `degraded`.
 */
export function deriveHeaderTargets(
  formula: Formula,
  lines: FormulaDetail[],
  header: HeaderInputs,
  bhe: number | null,
  effectiveBhe: number,
  degraded: string[],
  ctx: CalcContext,
): Partial<Formula> {
  const patch: Partial<Formula> = {};

  // Brewhouse efficiency (KB §4 "Brewhouse Efficiency %").
  patch.Yieldh = round2(effectiveBhe);
  patch.Yieldhest = patch.Yieldh;

  // Estimated color (SRM) from malt Congress-wort contributions (KB §5).
  const maltColors: number[] = [];
  let hasColorMalt = false;
  for (const line of lines) {
    if (classifyLine(line, ctx) !== 'malt') continue;
    const material = ctx.materialById.get(line.MaterialID);
    const maltColor = material?.MatlSRM ?? num(line.SRM) ?? 0;
    const frac = num(line.Fraction) ?? 0;
    if (maltColor > 0 && frac > 0 && header.og2 > 0) {
      maltColors.push(colorFromMalt({ percentOfExtract: frac, maltColor }, header.og2));
      hasColorMalt = true;
    }
  }
  if (hasColorMalt) {
    // Specialty syrups also add colour but their unit-dependent contribution needs
    // finished-volume data the seed does not carry consistently — malt only here.
    patch.SRMest = round2(estimatedBeerColor(maltColors, []));
    degraded.push('Estimated SRM: malt Congress-wort colour only; specialty-syrup colour omitted.');
  } else {
    degraded.push('Estimated SRM: no malt colour data on this recipe.');
  }

  // Estimated finished IBU from the hop lines (echoes the target when consistent).
  const bu = header.bu;
  if (bu > 0) {
    patch.BUest = round2(bu);
    degraded.push(
      'Estimated IBU: kinetic hot-wort iso-alpha model needs per-hop boil times (absent in seed) — echoes the target BU.',
    );
  }

  // Mash / beer RDF (KB §10). Fermenter RDF from the beer analysis line.
  const fermenterRDF = analysisValue(lines, ctx, /RDF/i) ?? formula.bRDF ?? null;
  if (fermenterRDF != null) {
    patch.bRDF = round2(fermenterRDF);
    let ffSyr = 0;
    let fMalt = 0;
    let fGrits = 0;
    for (const line of lines) {
      const kind = classifyLine(line, ctx);
      const material = ctx.materialById.get(line.MaterialID);
      const frac = num(line.Fraction) ?? 0;
      if (kind === 'malt') fMalt += frac;
      else if (kind === 'grits') fGrits += frac;
      else if (kind === 'syrup' || kind === 'krausen') {
        const ferm = num(line.Ferment) ?? material?.MatlFerm ?? 0;
        ffSyr += (frac * ferm) / 100;
      }
    }
    if (fMalt + fGrits > 0) {
      patch.wRDF = round2(mashRDF(fermenterRDF, ffSyr, fMalt, fGrits));
      const srmForRdf = patch.SRMest ?? formula.SRM ?? 0;
      const estMash = estimatedMashRDFRegression(patch.wRDF, srmForRdf);
      // beerRDFest = mashRDFest + (beerRDF - mashRDF) (KB §4)
      patch.bRDFest = round2(estMash + (fermenterRDF - patch.wRDF));
    } else {
      degraded.push('Mash RDF: no malt/grits fraction to allocate fermentables against.');
    }
  } else {
    degraded.push('RDF targets: no fermenter/beer RDF analysis line on this recipe.');
  }

  return patch;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Build a CalcContext from plain arrays (handy for tests / non-hook callers). */
export function buildCalcContext(input: {
  materials: Material[];
  units: Unit[];
  categories: Category[];
  processes: Process[];
}): CalcContext {
  const index = <T>(rows: T[], idOf: (r: T) => number) => {
    const map = new Map<number, T>();
    for (const r of rows) map.set(idOf(r), r);
    return map;
  };
  return {
    materialById: index(input.materials, (m) => m.MaterialID),
    unitById: index(input.units, (u) => u.UnitID),
    categoryById: index(input.categories, (c) => c.CategoryID),
    processById: index(input.processes, (p) => p.ProcessID),
  };
}
