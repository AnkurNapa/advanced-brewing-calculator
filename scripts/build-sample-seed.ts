/**
 * build-sample-seed.ts — generate an ORIGINAL sample dataset for the app to ship
 * as read-only seed. All names and recipes are invented for demonstration; the
 * ingredient coefficients are standard, commonly-published brewing properties
 * (extract yields, colours, hop alpha acids, unit conversions). No third-party
 * database is used or reproduced.
 *
 * Run: npm run seed
 * Output: src/lib/data/seed/*.json
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCalcContext,
  calculateForward,
} from '../src/lib/formulation/formulaCalc';

const OUT = path.resolve(__dirname, '../src/lib/data/seed');

// --- Units of measure (physical constants; base = value*perUnit + int) --------
// Base-unit IDs: weight MUST be 2 (the calc engine's BASE_UNIT_POUND constant).
const baseUnits = [
  { BaseUnitID: 2, BaseUnitname: 'Pound' },
  { BaseUnitID: 6, BaseUnitname: 'Barrel' },
  { BaseUnitID: 19, BaseUnitname: 'Fahrenheit' },
  { BaseUnitID: 4, BaseUnitname: 'Minute' },
  { BaseUnitID: 5, BaseUnitname: 'Percent' },
  { BaseUnitID: 13, BaseUnitname: 'mg/L' },
  { BaseUnitID: 7, BaseUnitname: 'SRM' },
  { BaseUnitID: 8, BaseUnitname: 'IBU' },
  { BaseUnitID: 9, BaseUnitname: 'Inch' },
];

const units = [
  { UnitID: 1, UnitName: 'Pounds', BaseUnitID: 2, BaseUnitPerUnit: 1, BaseunitInt: 0 },
  { UnitID: 2, UnitName: 'Kilograms', BaseUnitID: 2, BaseUnitPerUnit: 2.2046, BaseunitInt: 0 },
  { UnitID: 3, UnitName: 'Ounces', BaseUnitID: 2, BaseUnitPerUnit: 0.0625, BaseunitInt: 0 },
  { UnitID: 4, UnitName: 'Grams', BaseUnitID: 2, BaseUnitPerUnit: 0.00220462, BaseunitInt: 0 },
  { UnitID: 5, UnitName: 'Barrels', BaseUnitID: 6, BaseUnitPerUnit: 1, BaseunitInt: 0 },
  { UnitID: 6, UnitName: 'Hectoliters', BaseUnitID: 6, BaseUnitPerUnit: 0.8522, BaseunitInt: 0 },
  { UnitID: 7, UnitName: 'Liters', BaseUnitID: 6, BaseUnitPerUnit: 0.008522, BaseunitInt: 0 },
  { UnitID: 8, UnitName: 'US Gallons', BaseUnitID: 6, BaseUnitPerUnit: 0.032258, BaseunitInt: 0 },
  { UnitID: 9, UnitName: 'Fahrenheit', BaseUnitID: 19, BaseUnitPerUnit: 1, BaseunitInt: 0 },
  { UnitID: 10, UnitName: 'Celsius', BaseUnitID: 19, BaseUnitPerUnit: 1.8, BaseunitInt: 32 },
  { UnitID: 11, UnitName: 'Minutes', BaseUnitID: 4, BaseUnitPerUnit: 1, BaseunitInt: 0 },
  { UnitID: 12, UnitName: 'Percent', BaseUnitID: 5, BaseUnitPerUnit: 1, BaseunitInt: 0 },
  { UnitID: 13, UnitName: 'mg/L', BaseUnitID: 13, BaseUnitPerUnit: 1, BaseunitInt: 0 },
  { UnitID: 14, UnitName: 'SRM', BaseUnitID: 7, BaseUnitPerUnit: 1, BaseunitInt: 0 },
  { UnitID: 15, UnitName: 'IBU', BaseUnitID: 8, BaseUnitPerUnit: 1, BaseunitInt: 0 },
];

const inUnits = [
  { InUnitID: 1, InUnitname: '% of Extract' },
  { InUnitID: 2, InUnitname: '% of IBU' },
  { InUnitID: 3, InUnitname: '% w/w' },
  { InUnitID: 4, InUnitname: 'mg/L' },
  { InUnitID: 5, InUnitname: 'Direct' },
];

const category = [
  { CategoryID: 1, CategoryName: 'Base Malt', Categorysort: 1, categoryLoss: 0, Opstd: 'Yes' },
  { CategoryID: 2, CategoryName: 'Specialty Malt', Categorysort: 2, categoryLoss: 0, Opstd: 'Yes' },
  { CategoryID: 3, CategoryName: 'Adjunct', Categorysort: 3, categoryLoss: 0, Opstd: 'Yes' },
  { CategoryID: 4, CategoryName: 'Sugar', Categorysort: 4, categoryLoss: 0, Opstd: 'Yes' },
  { CategoryID: 5, CategoryName: 'Hop', Categorysort: 5, categoryLoss: 0, Opstd: 'Yes' },
  { CategoryID: 6, CategoryName: 'Water Salt', Categorysort: 6, categoryLoss: 0, Opstd: 'Yes' },
  { CategoryID: 7, CategoryName: 'Yeast', Categorysort: 7, categoryLoss: 0, Opstd: 'Yes' },
  { CategoryID: 8, CategoryName: 'Fining', Categorysort: 8, categoryLoss: 0, Opstd: 'Yes' },
  { CategoryID: 9, CategoryName: 'Analysis', Categorysort: 9, categoryLoss: 0, Opstd: 'No' },
];

const area = [
  { AreaID: 1, AreaSort: 1, AreaName: 'Hot Block' },
  { AreaID: 2, AreaSort: 2, AreaName: 'Yeast & Fermentation' },
  { AreaID: 3, AreaSort: 3, AreaName: 'Cold Block' },
  { AreaID: 4, AreaSort: 4, AreaName: 'Packaged' },
];

const process = [
  { ProcessID: 1, ProcessName: 'Mill', ProcessOrder: 1, ProcessPGCode: 'MILL', AreaID: 1 },
  { ProcessID: 2, ProcessName: 'Mash', ProcessOrder: 2, ProcessPGCode: 'MASH', AreaID: 1 },
  { ProcessID: 3, ProcessName: 'Lauter', ProcessOrder: 3, ProcessPGCode: 'LAUT', AreaID: 1 },
  { ProcessID: 4, ProcessName: 'Boil', ProcessOrder: 4, ProcessPGCode: 'BOIL', AreaID: 1 },
  { ProcessID: 5, ProcessName: 'Whirlpool', ProcessOrder: 5, ProcessPGCode: 'WHRL', AreaID: 1 },
  { ProcessID: 6, ProcessName: 'Cooling', ProcessOrder: 6, ProcessPGCode: 'COOL', AreaID: 1 },
  { ProcessID: 7, ProcessName: 'Fermentation', ProcessOrder: 7, ProcessPGCode: 'FERM', AreaID: 2 },
  { ProcessID: 8, ProcessName: 'Conditioning', ProcessOrder: 8, ProcessPGCode: 'COND', AreaID: 3 },
  { ProcessID: 9, ProcessName: 'Filtration', ProcessOrder: 9, ProcessPGCode: 'FILT', AreaID: 3 },
  { ProcessID: 10, ProcessName: 'Packaging', ProcessOrder: 10, ProcessPGCode: 'PACK', AreaID: 4 },
];

const plants = [
  { PlantID: 1, Plantname: 'Riverside Brewhouse', Porder: 1, MaxMalt: 2200, MaxMash: 30, LTDiam: 96, MaxKettle: 32, AlcEqOIML: true, RA: 40, Chloride: 60, Sulfate: 90 },
  { PlantID: 2, Plantname: 'Pilot System', Porder: 2, MaxMalt: 220, MaxMash: 3, LTDiam: 36, MaxKettle: 3.5, AlcEqOIML: true, RA: 30, Chloride: 50, Sulfate: 70 },
];

const products = [
  { ProductID: 1, ProductName: 'Golden Lager', PR3: 'GLD', PR3ruh: 'GLDR', PR3pkg: 'GLDP', CLossFerment: 2, CLossFilter: 1.5, BLossFerment: 2, BLossFilter: 1.5 },
  { ProductID: 2, ProductName: 'Hazy Session IPA', PR3: 'HAZ', PR3ruh: 'HAZR', PR3pkg: 'HAZP', CLossFerment: 3, CLossFilter: 2, BLossFerment: 3, BLossFilter: 2 },
  { ProductID: 3, ProductName: 'Coffee Oat Stout', PR3: 'STO', PR3ruh: 'STOR', PR3pkg: 'STOP', CLossFerment: 2.5, CLossFilter: 2, BLossFerment: 2.5, BLossFilter: 2 },
  { ProductID: 4, ProductName: 'Hefeweizen', PR3: 'WHT', PR3ruh: 'WHTR', PR3pkg: 'WHTP', CLossFerment: 2, CLossFilter: 1, BLossFerment: 2, BLossFilter: 1 },
  { ProductID: 5, ProductName: 'Amber Ale', PR3: 'AMB', PR3ruh: 'AMBR', PR3pkg: 'AMBP', CLossFerment: 2, CLossFilter: 1.5, BLossFerment: 2, BLossFilter: 1.5 },
  { ProductID: 6, ProductName: 'West Coast Pale', PR3: 'PAL', PR3ruh: 'PALR', PR3pkg: 'PALP', CLossFerment: 2.5, CLossFilter: 1.5, BLossFerment: 2.5, BLossFilter: 1.5 },
];

// --- Materials: standard published brewing properties -------------------------
type M = {
  id: number; name: string; cat: number; unit: number; inUnit: number;
  ext?: number; yld?: number; ferm?: number; srm?: number; pro?: number;
  ion?: string; cl?: number; so4?: number; ca?: number; mg?: number; hco3?: number;
};
const M: M[] = [
  // Base malts (extract % dry, colour SRM)
  { id: 1, name: 'Pilsner Malt', cat: 1, unit: 1, inUnit: 1, ext: 80, yld: 80, srm: 1.6, pro: 0.11 },
  { id: 2, name: 'Pale Ale Malt', cat: 1, unit: 1, inUnit: 1, ext: 79, yld: 79, srm: 3, pro: 0.11 },
  { id: 3, name: 'Vienna Malt', cat: 1, unit: 1, inUnit: 1, ext: 78, yld: 78, srm: 4, pro: 0.11 },
  { id: 4, name: 'Munich Malt', cat: 1, unit: 1, inUnit: 1, ext: 77, yld: 77, srm: 9, pro: 0.11 },
  { id: 5, name: 'Wheat Malt', cat: 1, unit: 1, inUnit: 1, ext: 81, yld: 81, srm: 2, pro: 0.13 },
  // Specialty malts
  { id: 6, name: 'Caramel 40', cat: 2, unit: 1, inUnit: 1, ext: 74, yld: 74, srm: 40, pro: 0.1 },
  { id: 7, name: 'Caramel 80', cat: 2, unit: 1, inUnit: 1, ext: 73, yld: 73, srm: 80, pro: 0.1 },
  { id: 8, name: 'Chocolate Malt', cat: 2, unit: 1, inUnit: 1, ext: 70, yld: 70, srm: 350, pro: 0.1 },
  { id: 9, name: 'Roasted Barley', cat: 2, unit: 1, inUnit: 1, ext: 68, yld: 68, srm: 500, pro: 0.1 },
  { id: 10, name: 'Melanoidin Malt', cat: 2, unit: 1, inUnit: 1, ext: 75, yld: 75, srm: 28, pro: 0.1 },
  // Adjuncts
  { id: 11, name: 'Flaked Oats', cat: 3, unit: 1, inUnit: 1, ext: 70, yld: 70, srm: 1, pro: 0.12 },
  { id: 12, name: 'Flaked Wheat', cat: 3, unit: 1, inUnit: 1, ext: 77, yld: 77, srm: 1, pro: 0.13 },
  { id: 13, name: 'Corn Grits', cat: 3, unit: 1, inUnit: 1, ext: 85, yld: 85, srm: 1, pro: 0.06 },
  // Sugars (highly fermentable)
  { id: 14, name: 'Cane Sugar', cat: 4, unit: 1, inUnit: 1, ext: 100, yld: 100, ferm: 100, srm: 1 },
  { id: 15, name: 'Dextrose', cat: 4, unit: 1, inUnit: 1, ext: 100, yld: 100, ferm: 100, srm: 0.5 },
  // Hops (alpha acid %, via Extract field used as % alpha for hop category)
  { id: 16, name: 'Noble Aroma Hop', cat: 5, unit: 3, inUnit: 2, ext: 3.5 },
  { id: 17, name: 'Bittering Hop A', cat: 5, unit: 3, inUnit: 2, ext: 14 },
  { id: 18, name: 'Citrus Hop', cat: 5, unit: 3, inUnit: 2, ext: 12 },
  { id: 19, name: 'Dank Hop', cat: 5, unit: 3, inUnit: 2, ext: 10 },
  { id: 20, name: 'Classic C Hop', cat: 5, unit: 3, inUnit: 2, ext: 6.5 },
  // Water salts (ion contributions mg/L per g/L basis)
  { id: 21, name: 'Gypsum', cat: 6, unit: 4, inUnit: 4, ion: 'CaSO4', ca: 232, so4: 558 },
  { id: 22, name: 'Calcium Chloride', cat: 6, unit: 4, inUnit: 4, ion: 'CaCl2', ca: 272, cl: 482 },
  { id: 23, name: 'Epsom Salt', cat: 6, unit: 4, inUnit: 4, ion: 'MgSO4', mg: 99, so4: 389 },
  { id: 24, name: 'Baking Soda', cat: 6, unit: 4, inUnit: 4, ion: 'NaHCO3', hco3: 726 },
  // Yeast
  { id: 25, name: 'Clean Ale Yeast', cat: 7, unit: 5, inUnit: 5 },
  { id: 26, name: 'Lager Yeast', cat: 7, unit: 5, inUnit: 5 },
  { id: 27, name: 'Hefeweizen Yeast', cat: 7, unit: 5, inUnit: 5 },
  // Finings
  { id: 28, name: 'Kettle Finings', cat: 8, unit: 4, inUnit: 5 },
  { id: 29, name: 'Yeast Nutrient', cat: 8, unit: 4, inUnit: 5 },
  // Analysis (spec side)
  { id: 30, name: 'Original Gravity', cat: 9, unit: 12, inUnit: 5 },
  { id: 31, name: 'Final Gravity', cat: 9, unit: 12, inUnit: 5 },
  { id: 32, name: 'Beer Colour', cat: 9, unit: 14, inUnit: 5 },
  { id: 33, name: 'Bitterness', cat: 9, unit: 15, inUnit: 5 },
  { id: 34, name: 'Alcohol by Volume', cat: 9, unit: 12, inUnit: 5 },
  { id: 35, name: 'Real Degree of Fermentation', cat: 9, unit: 12, inUnit: 5 },
];

const materials = M.map((m) => ({
  MaterialID: m.id,
  MaterialName: m.name,
  MaterialPGCode: null,
  CategoryID: m.cat,
  UnitID: m.unit,
  InUnitID: m.inUnit,
  Ion: m.ion ?? null,
  MatlExt: m.ext ?? null,
  MatlYld: m.yld ?? null,
  MatlFerm: m.ferm ?? null,
  MatlSRM: m.srm ?? null,
  MatlPro: m.pro ?? null,
  Chloride: m.cl ?? null,
  Sulfate: m.so4 ?? null,
  Calcium: m.ca ?? null,
  Magnesium: m.mg ?? null,
  Bicarbonate: m.hco3 ?? null,
  Carbonate: null,
  Acid: null,
}));

const dates = [
  { EdateID: 1, Edate: '2025-03-01' },
  { EdateID: 2, Edate: '2025-06-15' },
  { EdateID: 3, Edate: '2025-09-01' },
  { EdateID: 4, Edate: '2026-01-10' },
];

const transfer = [
  { TransferID: 1, TransferName: 'First Addition', TransferType: 'Kettle' },
  { TransferID: 2, TransferName: 'Second Addition', TransferType: 'Kettle' },
  { TransferID: 3, TransferName: 'Dry Hop', TransferType: 'Fermenter' },
];

// --- Recipe builder -----------------------------------------------------------
type Line = [process: number, material: number, fraction: number, unit: number, inUnit: number, transfer?: number];
let lineRows: Record<string, unknown>[] = [];
function addLines(formulaId: number, lines: Line[]): void {
  lines.forEach(([proc, mat, frac, unit, inUnit, transfer], i) => {
    lineRows.push({
      FormulaID: formulaId, ProcessID: proc, MaterialID: mat, TransferID: transfer ?? null,
      FUnitID: unit, FInUnitID: inUnit, Qorder: (i + 1) * 1.0, MText: null,
      Fraction: frac, Quantity: null, Qtext: '', Qround: 0,
      Extract: null, Yield: null, Ferment: null, Qopstd: null, Uopstd: null,
      PR3a: null, OG2a: null, Bbl2a: null, SRM: null, Revision: null,
    });
  });
}

// header: plant, product, date, OG(°P), volume(bbl), IBU, SRM, mash/beer RDF
const formulaDefs: Array<{
  id: number; plant: number; product: number; date: number;
  og: number; bbl: number; bu: number; srm: number; wrdf: number; brdf: number; lines: Line[];
}> = [
  { id: 1, plant: 1, product: 1, date: 1, og: 11.2, bbl: 100, bu: 22, srm: 3.5, wrdf: 82, brdf: 80, lines: [
    [1, 1, 90, 1, 1], [1, 4, 8, 1, 1], [1, 13, 2, 1, 1],
    [4, 16, 40, 3, 2, 1], [4, 17, 60, 3, 2, 2], [4, 28, 1, 4, 5],
    [2, 21, 60, 4, 4], [7, 26, 1, 5, 5],
  ] },
  { id: 2, plant: 1, product: 2, date: 2, og: 13.8, bbl: 100, bu: 45, srm: 6, wrdf: 76, brdf: 74, lines: [
    [1, 2, 70, 1, 1], [1, 5, 15, 1, 1], [1, 11, 10, 1, 1], [1, 12, 5, 1, 1],
    [4, 17, 30, 3, 2, 1], [4, 18, 30, 3, 2, 2], [5, 18, 20, 3, 2],
    [7, 18, 200, 4, 4, 3], [7, 19, 150, 4, 4, 3], [7, 25, 1, 5, 5],
    [2, 22, 80, 4, 4],
  ] },
  { id: 3, plant: 1, product: 3, date: 2, og: 15.5, bbl: 80, bu: 35, srm: 42, wrdf: 70, brdf: 68, lines: [
    [1, 2, 72, 1, 1], [1, 11, 10, 1, 1], [1, 7, 6, 1, 1], [1, 8, 7, 1, 1], [1, 9, 5, 1, 1],
    [4, 17, 55, 3, 2, 1], [4, 20, 45, 3, 2, 2], [7, 25, 1, 5, 5],
  ] },
  { id: 4, plant: 1, product: 4, date: 3, og: 12.4, bbl: 100, bu: 12, srm: 4, wrdf: 80, brdf: 78, lines: [
    [1, 5, 55, 1, 1], [1, 1, 45, 1, 1],
    [4, 16, 100, 3, 2, 1], [7, 27, 1, 5, 5],
  ] },
  { id: 5, plant: 2, product: 5, date: 3, og: 13.0, bbl: 3, bu: 28, srm: 12, wrdf: 76, brdf: 74, lines: [
    [1, 2, 80, 1, 1], [1, 4, 12, 1, 1], [1, 6, 8, 1, 1],
    [4, 20, 60, 3, 2, 1], [4, 17, 40, 3, 2, 2], [7, 25, 1, 5, 5],
    [2, 21, 70, 4, 4],
  ] },
  { id: 6, plant: 2, product: 6, date: 4, og: 12.8, bbl: 3, bu: 40, srm: 7, wrdf: 78, brdf: 76, lines: [
    [1, 2, 88, 1, 1], [1, 6, 6, 1, 1], [1, 3, 6, 1, 1],
    [4, 17, 40, 3, 2, 1], [4, 20, 30, 3, 2, 2], [5, 19, 30, 3, 2],
    [7, 19, 180, 4, 4, 3], [7, 25, 1, 5, 5], [2, 21, 90, 4, 4],
  ] },
];

const rawFormula = formulaDefs.map((f) => {
  addLines(f.id, f.lines);
  return {
    FormulaID: f.id, PlantID: f.plant, ProductID: f.product, EdateID: f.date, edateIDo: null,
    Yieldm: f.wrdf, Yieldh: 90, BU: f.bu, OG1: f.og, Bbl1: f.bbl, OG2m: f.og * 0.98, Bbl2m: f.bbl * 1.02,
    SRM: f.srm, SRMest: f.srm, VolID: 5, PrintBox: true, SkipBox: false, LogChange: null,
    Yieldhest: 90, BUest: f.bu, wRDF: f.wrdf, bRDF: f.brdf, bRDFest: f.brdf,
    RunOffP: null, fwSRM: null, fwRA: null, YieldL: null,
  };
});

// Analysis-parameter lines (OG/IBU/colour/RDF) on the spec-matched formulas, so
// the Compare module has resolvable rows. These are passthrough for the calc.
addLines(1, [[7, 30, 11.2, 12, 5], [4, 33, 22, 15, 5], [7, 32, 3.5, 14, 5], [7, 35, 80, 12, 5]]);
addLines(2, [[7, 30, 13.8, 12, 5], [4, 33, 45, 15, 5], [7, 32, 6, 14, 5], [7, 35, 74, 12, 5]]);
addLines(5, [[7, 30, 13.0, 12, 5], [4, 33, 28, 15, 5], [7, 32, 12, 14, 5], [7, 35, 74, 12, 5]]);

// Bake a forward-calc pass so the shipped recipes carry reported ingredient
// weights (like calculated operating standards), which the derivations read.
const calcCtx = buildCalcContext({
  materials: materials as never[],
  units: units as never[],
  categories: category as never[],
  processes: process as never[],
});
const bakedLines: Record<string, unknown>[] = [];
const formula = rawFormula.map((f) => {
  const fl = lineRows.filter((l) => (l as { FormulaID: number }).FormulaID === f.FormulaID);
  const r = calculateForward(f as never, fl as never, calcCtx);
  // Populate the reported value (Qtext) from the calculated quantity, as a
  // calculated operating standard would carry; the derivations read it.
  const baked = (r.lines as unknown as Record<string, unknown>[]).map((l) => {
    const q = l.Quantity as number | null;
    return { ...l, Qtext: q != null ? String(Number(q.toFixed(3))) : '' };
  });
  bakedLines.push(...baked);
  return r.formula as unknown as Record<string, unknown>;
});
const formulaDetails = bakedLines;

// --- Specification set (parallel "S" tables) ----------------------------------
const sCategory = [
  { categoryID: 1, categoryname: 'Gravity' },
  { categoryID: 2, categoryname: 'Colour & Bitterness' },
  { categoryID: 3, categoryname: 'Fermentation' },
];
const sMaterials = [
  { MaterialID: 1, MaterialName: 'Original Gravity', MaterialPGCode: null, CategoryID: 1, UnitID: 12 },
  { MaterialID: 2, MaterialName: 'Final Gravity', MaterialPGCode: null, CategoryID: 1, UnitID: 12 },
  { MaterialID: 3, MaterialName: 'Beer Colour', MaterialPGCode: null, CategoryID: 2, UnitID: 14 },
  { MaterialID: 4, MaterialName: 'Bitterness', MaterialPGCode: null, CategoryID: 2, UnitID: 15 },
  { MaterialID: 5, MaterialName: 'RDF', MaterialPGCode: null, CategoryID: 3, UnitID: 12 },
];

let sLineRows: Record<string, unknown>[] = [];
function addSLines(fid: number, rows: Array<[proc: number, mat: number, nominal: number, low: number, high: number, unit: number]>): void {
  rows.forEach(([proc, mat, nom, low, high, unit], i) => {
    sLineRows.push({
      formulaID: fid, processID: proc, materialID: mat, FUnitID: unit, qorder: (i + 1) * 1.0,
      mtext: null, InT: nom, InV: nom, CalcT: nom, CalcV: nom,
      q1: String(low), q2: String(nom), q3: String(high), qround: 0,
      pr3a: null, Revision: null, RefCalc: null,
    });
  });
}
// specs share Plant+Product with formulas so the Compare module has a default pair
const sFormulaDefs = [
  { id: 1, plant: 1, product: 1, date: 1, rows: [
    [7, 1, 11.2, 11.0, 11.4, 12], [10, 2, 2.2, 2.0, 2.4, 12],
    [10, 3, 3.5, 3.0, 4.0, 14], [4, 4, 22, 20, 24, 15], [7, 5, 80, 78, 82, 12],
  ] as Array<[number, number, number, number, number, number]> },
  { id: 2, plant: 1, product: 2, date: 2, rows: [
    [7, 1, 13.8, 13.5, 14.1, 12], [10, 2, 3.0, 2.7, 3.3, 12],
    [10, 3, 6.0, 5.0, 7.0, 14], [4, 4, 45, 42, 48, 15], [7, 5, 74, 72, 76, 12],
  ] as Array<[number, number, number, number, number, number]> },
  { id: 3, plant: 2, product: 5, date: 3, rows: [
    [7, 1, 13.0, 12.7, 13.3, 12], [10, 3, 12, 10, 14, 14],
    [4, 4, 28, 26, 30, 15], [7, 5, 74, 72, 76, 12],
  ] as Array<[number, number, number, number, number, number]> },
];
const sFormula = sFormulaDefs.map((s) => {
  addSLines(s.id, s.rows);
  return {
    formulaID: s.id, plantID: s.plant, productID: s.product, edateID: s.date, edateIDo: null,
    mxsyr: null, mxsyrf: null, mxcol: null, mxbu: null, printbox: true, skipbox: false,
  };
});
const sFormulaDetails = sLineRows;

// Compare mapping: Formula (ProcessID, MaterialID) -> Spec (ProcessID, AnalysisID)
const compareFormSpec = [
  { sortfield: 1, FProcessID: 7, FMaterialID: 30, FUnitID: 12, SProcessID: 7, SAnalysisID: 1, SUnitID: 12 },
  { sortfield: 2, FProcessID: 4, FMaterialID: 33, FUnitID: 15, SProcessID: 4, SAnalysisID: 4, SUnitID: 15 },
  { sortfield: 3, FProcessID: 7, FMaterialID: 32, FUnitID: 14, SProcessID: 10, SAnalysisID: 3, SUnitID: 14 },
  { sortfield: 4, FProcessID: 7, FMaterialID: 35, FUnitID: 12, SProcessID: 7, SAnalysisID: 5, SUnitID: 12 },
];

const losses: unknown[] = [];
const prices: unknown[] = [];
const blend: unknown[] = [];

const tables: Record<string, unknown[]> = {
  baseUnits, units, inUnits, category, materials, plants, products, process, dates,
  transfer, losses, prices, formula, formulaDetails, blend, sFormula, sFormulaDetails,
  sMaterials, sCategory, area, compareFormSpec,
};

fs.mkdirSync(OUT, { recursive: true });
const manifest: Record<string, number> = {};
for (const [name, rows] of Object.entries(tables)) {
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(rows, null, 0));
  manifest[name] = rows.length;
  console.log(`  ${name.padEnd(16)} ${rows.length}`);
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nSample seed written to ${OUT}`);
