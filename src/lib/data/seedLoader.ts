/**
 * seedLoader.ts
 * Typed import of every bundled read-only seed JSON table, cast to the
 * shared `types.ts` interfaces. The seed is the immutable baseline that
 * repository.ts overlays user edits on top of.
 *
 * The imported arrays are frozen so no downstream code can mutate the seed.
 */

import type {
  BaseUnit,
  Unit,
  InUnit,
  Category,
  Material,
  Plant,
  Product,
  Process,
  BrewDate,
  Transfer,
  Loss,
  Price,
  Formula,
  FormulaDetail,
  Blend,
  SFormula,
  SFormulaDetail,
  SMaterial,
  SCategory,
  Area,
  CompareFormSpec,
} from './types';

import baseUnitsRaw from './seed/baseUnits.json';
import unitsRaw from './seed/units.json';
import inUnitsRaw from './seed/inUnits.json';
import categoryRaw from './seed/category.json';
import materialsRaw from './seed/materials.json';
import plantsRaw from './seed/plants.json';
import productsRaw from './seed/products.json';
import processRaw from './seed/process.json';
import datesRaw from './seed/dates.json';
import transferRaw from './seed/transfer.json';
import lossesRaw from './seed/losses.json';
import pricesRaw from './seed/prices.json';
import formulaRaw from './seed/formula.json';
import formulaDetailsRaw from './seed/formulaDetails.json';
import blendRaw from './seed/blend.json';
import sFormulaRaw from './seed/sFormula.json';
import sFormulaDetailsRaw from './seed/sFormulaDetails.json';
import sMaterialsRaw from './seed/sMaterials.json';
import sCategoryRaw from './seed/sCategory.json';
import areaRaw from './seed/area.json';
import compareFormSpecRaw from './seed/compareFormSpec.json';

/** The complete, read-only bundled seed data set. */
export interface SeedData {
  baseUnits: BaseUnit[];
  units: Unit[];
  inUnits: InUnit[];
  category: Category[];
  materials: Material[];
  plants: Plant[];
  products: Product[];
  process: Process[];
  dates: BrewDate[];
  transfer: Transfer[];
  losses: Loss[];
  prices: Price[];
  formula: Formula[];
  formulaDetails: FormulaDetail[];
  blend: Blend[];
  sFormula: SFormula[];
  sFormulaDetails: SFormulaDetail[];
  sMaterials: SMaterial[];
  sCategory: SCategory[];
  area: Area[];
  compareFormSpec: CompareFormSpec[];
}

// JSON is cast to the domain interfaces. The build-seed script guarantees the
// shapes; `unknown` bridges the structural gap without editing the contract.
const seed: SeedData = Object.freeze({
  baseUnits: baseUnitsRaw as unknown as BaseUnit[],
  units: unitsRaw as unknown as Unit[],
  inUnits: inUnitsRaw as unknown as InUnit[],
  category: categoryRaw as unknown as Category[],
  materials: materialsRaw as unknown as Material[],
  plants: plantsRaw as unknown as Plant[],
  products: productsRaw as unknown as Product[],
  process: processRaw as unknown as Process[],
  dates: datesRaw as unknown as BrewDate[],
  transfer: transferRaw as unknown as Transfer[],
  losses: lossesRaw as unknown as Loss[],
  prices: pricesRaw as unknown as Price[],
  formula: formulaRaw as unknown as Formula[],
  formulaDetails: formulaDetailsRaw as unknown as FormulaDetail[],
  blend: blendRaw as unknown as Blend[],
  sFormula: sFormulaRaw as unknown as SFormula[],
  sFormulaDetails: sFormulaDetailsRaw as unknown as SFormulaDetail[],
  sMaterials: sMaterialsRaw as unknown as SMaterial[],
  sCategory: sCategoryRaw as unknown as SCategory[],
  area: areaRaw as unknown as Area[],
  compareFormSpec: compareFormSpecRaw as unknown as CompareFormSpec[],
});

/** Return the frozen, read-only seed data set. */
export function getSeed(): SeedData {
  return seed;
}
