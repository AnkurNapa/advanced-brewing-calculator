/**
 * Domain types for the Advanced Brewing Calculator.
 * These mirror the Master Brewers Toolbox `brewdat.mdb` columns exactly
 * (see MasterBrewers_KB/02_Data_Model.md). Nullable DB columns are `| null`.
 * This file is the shared contract for the engine, data, and UI layers.
 */

export interface BaseUnit {
  BaseUnitID: number;
  BaseUnitname: string | null;
}

export interface Unit {
  UnitID: number;
  UnitName: string | null;
  BaseUnitID: number | null;
  /** base = value * BaseUnitPerUnit + BaseunitInt */
  BaseUnitPerUnit: number | null;
  BaseunitInt: number | null;
}

export interface InUnit {
  InUnitID: number;
  InUnitname: string | null;
}

export interface Category {
  CategoryID: number;
  CategoryName: string;
  Categorysort: number | null;
  categoryLoss: number | null;
  Opstd: string;
}

export interface Material {
  MaterialID: number;
  MaterialName: string;
  MaterialPGCode: string | null;
  CategoryID: number;
  UnitID: number | null;
  InUnitID: number | null;
  Ion: string | null;
  MatlExt: number | null;
  MatlYld: number | null;
  MatlFerm: number | null;
  MatlSRM: number | null;
  MatlPro: number | null;
  Chloride: number | null;
  Sulfate: number | null;
  Calcium: number | null;
  Magnesium: number | null;
  Bicarbonate: number | null;
  Carbonate: number | null;
  Acid: number | null;
}

export interface Plant {
  PlantID: number;
  Plantname: string;
  Porder: number;
  MaxMalt: number;
  MaxMash: number;
  LTDiam: number;
  MaxKettle: number;
  AlcEqOIML: boolean;
  RA: number | null;
  Chloride: number | null;
  Sulfate: number | null;
}

export interface Product {
  ProductID: number;
  ProductName: string;
  PR3: string;
  PR3ruh: string;
  PR3pkg: string;
  CLossFerment: number | null;
  CLossFilter: number | null;
  BLossFerment: number | null;
  BLossFilter: number | null;
}

export interface Process {
  ProcessID: number;
  ProcessName: string;
  ProcessOrder: number;
  ProcessPGCode: string;
  AreaID: number | null;
}

export interface BrewDate {
  EdateID: number;
  Edate: string; // ISO date
}

export interface Transfer {
  TransferID: number;
  TransferName: string | null;
  TransferType: string | null;
}

export interface Loss {
  PlantID: number;
  ProductID: number;
  ProcessID: number;
  Loss: number | null;
}

export interface Price {
  PlantID: number;
  MaterialID: number;
  PriceUnitID: number;
  Price: number;
  Notes: string | null;
  PartNumber: string | null;
}

/** Recipe header — one recipe = Plant + Product + effective Date. */
export interface Formula {
  FormulaID: number;
  PlantID: number;
  ProductID: number;
  EdateID: number;
  edateIDo: number | null;
  Yieldm: number | null; // mash yield / brewhouse efficiency %
  Yieldh: number | null;
  BU: number | null; // finished bitterness (IBU)
  OG1: number | null; // fermenter OG (%w/w)
  Bbl1: number | null; // fermenter volume
  OG2m: number | null;
  Bbl2m: number | null;
  SRM: number | null; // finished color
  SRMest: number | null; // estimated color
  VolID: number | null;
  PrintBox: boolean;
  SkipBox: boolean;
  LogChange: string | null;
  Yieldhest: number | null;
  BUest: number | null; // estimated IBU
  wRDF: number | null; // mash RDF
  bRDF: number | null; // fermenter/beer RDF
  bRDFest: number | null; // estimated beer RDF
  RunOffP: number | null;
  fwSRM: number | null;
  fwRA: number | null;
  YieldL: number | null;
}

/** Recipe line — a Material at a Process step, in units, optional Transfer extension. */
export interface FormulaDetail {
  FormulaID: number;
  ProcessID: number;
  MaterialID: number;
  TransferID: number | null;
  FUnitID: number | null;
  FInUnitID: number | null;
  Qorder: number | null; // stage sort key (real number)
  MText: string | null;
  Fraction: number; // formulation value (the calc driver)
  Quantity: number | null; // calculated value
  Qtext: string; // reported value (text)
  Qround: number; // rounding increment
  Extract: number | null; // % solids
  Yield: number | null; // % yield
  Ferment: number | null; // syrup % fermented
  Qopstd: number | null;
  Uopstd: string | null;
  PR3a: string | null;
  OG2a: number | null;
  Bbl2a: number | null;
  SRM: number | null;
  Revision: string | null;
}

export interface Blend {
  FIDB: number;
  OGB: number | null;
  FID1: number | null;
  OG1: number | null;
  FID2: number | null;
  OG2: number | null;
  V1: number | null;
  [key: string]: number | string | null; // str01..str17, rdf/abw/color/bu 1/2/b
}

/** Specification ("S") parallel set. */
export interface SFormula {
  formulaID: number;
  plantID: number | null;
  productID: number | null;
  edateID: number | null;
  edateIDo: number | null;
  mxsyr: number | null;
  mxsyrf: number | null;
  mxcol: number | null;
  mxbu: number | null;
  printbox: boolean;
  skipbox: boolean;
}

export interface SFormulaDetail {
  formulaID: number;
  processID: number;
  materialID: number;
  FUnitID: number | null;
  qorder: number;
  mtext: string | null;
  InT: number;
  InV: number;
  CalcT: number | null;
  CalcV: number | null;
  q1: string;
  q2: string;
  q3: string;
  qround: number;
  pr3a: string | null;
  Revision: string | null;
  RefCalc: string | null;
}

export interface SMaterial {
  MaterialID: number;
  MaterialName: string;
  MaterialPGCode: string | null;
  CategoryID: number;
  UnitID: number;
}

export interface SCategory {
  categoryID: number;
  categoryname: string | null;
}

/** Process-area grouping (Hot Block, Yeast & Fermentation, Cold Block, Packaged). */
export interface Area {
  AreaID: number;
  AreaSort: number | null;
  AreaName: string | null;
}

/** Compare-engine mapping: which Formula line is checked against which Spec analysis. */
export interface CompareFormSpec {
  sortfield: number;
  FProcessID: number;
  FMaterialID: number;
  FUnitID: number;
  SProcessID: number;
  SAnalysisID: number;
  SUnitID: number;
}

/** Unit display system for the UI toggle. Engine always computes in base units. */
export type UnitSystem = 'metric' | 'us';
