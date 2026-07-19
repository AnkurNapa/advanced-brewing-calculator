/**
 * repository.ts
 * Repository over the bundled read-only seed with a localStorage overlay for
 * user edits. Reads merge the overlay on top of the seed; every write returns
 * new objects and re-persists a new overlay (the seed is never mutated).
 *
 * A StorageAdapter is injected so tests can pass a Map-backed fake. In the
 * browser it defaults to `window.localStorage`; under SSR it is a no-op.
 */

import { getSeed } from './seedLoader';
import type {
  Category,
  Formula,
  FormulaDetail,
  Material,
  Plant,
  Process,
  Product,
  Unit,
} from './types';
import {
  OVERLAY_KEY,
  emptyOverlay,
  lineKey,
  normalizeOverlay,
} from './overlay';
import type { EntityPatch, Overlay, StorageAdapter } from './overlay';

// ---------------------------------------------------------------------------
// Storage adapter
// ---------------------------------------------------------------------------

/** No-op adapter used under SSR / when localStorage is unavailable. */
const memoryFallback = new Map<string, string>();
const noopAdapter: StorageAdapter = {
  getItem: (k) => memoryFallback.get(k) ?? null,
  setItem: (k, v) => void memoryFallback.set(k, v),
  removeItem: (k) => void memoryFallback.delete(k),
};

/** Default adapter: real localStorage in the browser, memory otherwise. */
export function defaultStorage(): StorageAdapter {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return noopAdapter;
}

// ---------------------------------------------------------------------------
// Pure merge helpers
// ---------------------------------------------------------------------------

/** Merge an EntityPatch over its seed rows, immutably. */
function mergeEntities<T>(seedRows: readonly T[], patch: EntityPatch<T>, idOf: (row: T) => number): T[] {
  const deleted = new Set(patch.deletedIds);
  const merged: T[] = [];
  for (const row of seedRows) {
    const id = idOf(row);
    if (deleted.has(id)) continue;
    const up = patch.updated[id];
    merged.push(up ? { ...row, ...up } : row);
  }
  for (const created of patch.created) {
    const id = idOf(created);
    if (deleted.has(id)) continue;
    const up = patch.updated[id];
    merged.push(up ? { ...created, ...up } : created);
  }
  return merged;
}

/** Merge line upserts/deletes over the seed formula details, immutably. */
function mergeLines(seedRows: readonly FormulaDetail[], overlay: Overlay): FormulaDetail[] {
  const deleted = new Set(overlay.lines.deletedKeys);
  const upserts = overlay.lines.upserts;
  const usedKeys = new Set<string>();
  const merged: FormulaDetail[] = [];
  for (const row of seedRows) {
    const key = lineKey(row);
    if (deleted.has(key)) continue;
    if (upserts[key]) {
      merged.push(upserts[key]);
      usedKeys.add(key);
    } else {
      merged.push(row);
    }
  }
  // Upserts that did not match a seed row are brand-new created lines.
  for (const key of Object.keys(upserts)) {
    if (usedKeys.has(key) || deleted.has(key)) continue;
    merged.push(upserts[key]);
  }
  return merged;
}

function nextId<T>(rows: readonly T[], idOf: (r: T) => number): number {
  let max = 0;
  for (const r of rows) {
    const id = idOf(r);
    if (id > max) max = id;
  }
  return max + 1;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class Repository {
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter = defaultStorage()) {
    this.storage = storage;
  }

  // --- overlay persistence -------------------------------------------------

  /** Read + normalize the overlay from storage (never throws). */
  getOverlay(): Overlay {
    try {
      const raw = this.storage.getItem(OVERLAY_KEY);
      if (!raw) return emptyOverlay();
      return normalizeOverlay(JSON.parse(raw));
    } catch {
      return emptyOverlay();
    }
  }

  /** Persist a full overlay (immutable — caller passes a new object). */
  setOverlay(next: Overlay): void {
    this.storage.setItem(OVERLAY_KEY, JSON.stringify(next));
  }

  /** Clear all user edits. */
  reset(): void {
    this.storage.removeItem(OVERLAY_KEY);
  }

  // --- formulas ------------------------------------------------------------

  listFormulas(): Formula[] {
    return mergeEntities(getSeed().formula, this.getOverlay().formulas, (f) => f.FormulaID);
  }

  getFormula(id: number): Formula | undefined {
    return this.listFormulas().find((f) => f.FormulaID === id);
  }

  /** Lines for a formula, sorted by Process.ProcessOrder then Qorder. */
  getFormulaLines(formulaId: number): FormulaDetail[] {
    const overlay = this.getOverlay();
    const lines = mergeLines(getSeed().formulaDetails, overlay).filter(
      (l) => l.FormulaID === formulaId,
    );
    const processOrder = this.processOrderMap();
    return [...lines].sort((a, b) => {
      const pa = processOrder.get(a.ProcessID) ?? Number.MAX_SAFE_INTEGER;
      const pb = processOrder.get(b.ProcessID) ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      return (a.Qorder ?? 0) - (b.Qorder ?? 0);
    });
  }

  createFormula(partial: Partial<Formula>): Formula {
    const overlay = this.getOverlay();
    const existing = this.listFormulas();
    const id = partial.FormulaID ?? nextId(existing, (f: Formula) => f.FormulaID);
    const formula: Formula = { ...blankFormula(id), ...partial, FormulaID: id };
    const next: Overlay = {
      ...overlay,
      formulas: {
        ...overlay.formulas,
        created: [...overlay.formulas.created, formula],
        deletedIds: overlay.formulas.deletedIds.filter((d) => d !== id),
      },
    };
    this.setOverlay(next);
    return formula;
  }

  updateFormula(id: number, patch: Partial<Formula>): Formula | undefined {
    const overlay = this.getOverlay();
    const createdIdx = overlay.formulas.created.findIndex((f) => f.FormulaID === id);
    let next: Overlay;
    if (createdIdx >= 0) {
      // Patch an overlay-created formula in place.
      const created = overlay.formulas.created.map((f, i) =>
        i === createdIdx ? { ...f, ...patch, FormulaID: id } : f,
      );
      next = { ...overlay, formulas: { ...overlay.formulas, created } };
    } else {
      next = {
        ...overlay,
        formulas: {
          ...overlay.formulas,
          updated: { ...overlay.formulas.updated, [id]: { ...overlay.formulas.updated[id], ...patch } },
        },
      };
    }
    this.setOverlay(next);
    return this.getFormula(id);
  }

  deleteFormula(id: number): void {
    const overlay = this.getOverlay();
    const created = overlay.formulas.created.filter((f) => f.FormulaID !== id);
    const { [id]: _removed, ...updated } = overlay.formulas.updated;
    const deletedIds = overlay.formulas.deletedIds.includes(id)
      ? overlay.formulas.deletedIds
      : [...overlay.formulas.deletedIds, id];
    const next: Overlay = {
      ...overlay,
      formulas: { created, updated, deletedIds },
    };
    this.setOverlay(next);
  }

  // --- formula lines -------------------------------------------------------

  upsertLine(line: FormulaDetail): FormulaDetail {
    const overlay = this.getOverlay();
    const key = lineKey(line);
    const next: Overlay = {
      ...overlay,
      lines: {
        upserts: { ...overlay.lines.upserts, [key]: line },
        deletedKeys: overlay.lines.deletedKeys.filter((k) => k !== key),
      },
    };
    this.setOverlay(next);
    return line;
  }

  deleteLine(formulaId: number, processId: number, materialId: number): void {
    const overlay = this.getOverlay();
    const key = lineKey({ FormulaID: formulaId, ProcessID: processId, MaterialID: materialId });
    const { [key]: _removed, ...upserts } = overlay.lines.upserts;
    const deletedKeys = overlay.lines.deletedKeys.includes(key)
      ? overlay.lines.deletedKeys
      : [...overlay.lines.deletedKeys, key];
    const next: Overlay = { ...overlay, lines: { upserts, deletedKeys } };
    this.setOverlay(next);
  }

  // --- support tables ------------------------------------------------------

  listMaterials(): Material[] {
    return mergeEntities(getSeed().materials, this.getOverlay().support.materials, (m) => m.MaterialID);
  }

  listPlants(): Plant[] {
    return mergeEntities(getSeed().plants, this.getOverlay().support.plants, (p) => p.PlantID);
  }

  listProducts(): Product[] {
    return mergeEntities(getSeed().products, this.getOverlay().support.products, (p) => p.ProductID);
  }

  listProcesses(): Process[] {
    return mergeEntities(getSeed().process, this.getOverlay().support.processes, (p) => p.ProcessID);
  }

  listUnits(): Unit[] {
    return mergeEntities(getSeed().units, this.getOverlay().support.units, (u) => u.UnitID);
  }

  listCategories(): Category[] {
    // Categories have no overlay layer; returned straight from seed.
    return getSeed().category;
  }

  // --- resolvers -----------------------------------------------------------

  private processOrderMap(): Map<number, number> {
    const map = new Map<number, number>();
    for (const p of this.listProcesses()) map.set(p.ProcessID, p.ProcessOrder);
    return map;
  }

  unitById(id: number | null): Unit | undefined {
    if (id == null) return undefined;
    return this.listUnits().find((u) => u.UnitID === id);
  }

  materialById(id: number | null): Material | undefined {
    if (id == null) return undefined;
    return this.listMaterials().find((m) => m.MaterialID === id);
  }

  plantById(id: number | null): Plant | undefined {
    if (id == null) return undefined;
    return this.listPlants().find((p) => p.PlantID === id);
  }

  productById(id: number | null): Product | undefined {
    if (id == null) return undefined;
    return this.listProducts().find((p) => p.ProductID === id);
  }

  processById(id: number | null): Process | undefined {
    if (id == null) return undefined;
    return this.listProcesses().find((p) => p.ProcessID === id);
  }

  categoryById(id: number | null): Category | undefined {
    if (id == null) return undefined;
    return this.listCategories().find((c) => c.CategoryID === id);
  }
}

/** A zeroed Formula row used as the base for created formulas. */
function blankFormula(id: number): Formula {
  return {
    FormulaID: id,
    PlantID: 0,
    ProductID: 0,
    EdateID: 0,
    edateIDo: null,
    Yieldm: null,
    Yieldh: null,
    BU: null,
    OG1: null,
    Bbl1: null,
    OG2m: null,
    Bbl2m: null,
    SRM: null,
    SRMest: null,
    VolID: null,
    PrintBox: false,
    SkipBox: false,
    LogChange: null,
    Yieldhest: null,
    BUest: null,
    wRDF: null,
    bRDF: null,
    bRDFest: null,
    RunOffP: null,
    fwSRM: null,
    fwRA: null,
    YieldL: null,
  };
}

/** Default singleton repository bound to the default storage adapter. */
export const repository = new Repository();
