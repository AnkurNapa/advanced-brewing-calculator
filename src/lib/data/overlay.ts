/**
 * overlay.ts
 * Defines the localStorage overlay shape and a pluggable StorageAdapter so the
 * repository can be exercised in tests with a Map-backed fake instead of the
 * real browser `localStorage`. All merge logic here is pure and immutable.
 */

import type { Formula, FormulaDetail, Material, Plant, Product, Process, Unit } from './types';

/** The single localStorage key that holds the entire user-edit overlay. */
export const OVERLAY_KEY = 'abc:data:v1';

/** Schema version for the overlay payload (bump on breaking layout changes). */
export const OVERLAY_VERSION = 1;

/** Composite key for a formula line (FormulaID:ProcessID:MaterialID). */
export function lineKey(l: Pick<FormulaDetail, 'FormulaID' | 'ProcessID' | 'MaterialID'>): string {
  return `${l.FormulaID}:${l.ProcessID}:${l.MaterialID}`;
}

/** Patch set for a keyed-by-numeric-id entity table. */
export interface EntityPatch<T> {
  created: T[];
  updated: Record<number, Partial<T>>;
  deletedIds: number[];
}

/** Line patch set — lines have a composite key, so keyed by string. */
export interface LinePatch {
  upserts: Record<string, FormulaDetail>;
  deletedKeys: string[];
}

/** The full overlay persisted under OVERLAY_KEY. */
export interface Overlay {
  version: number;
  formulas: EntityPatch<Formula>;
  lines: LinePatch;
  support: {
    materials: EntityPatch<Material>;
    plants: EntityPatch<Plant>;
    products: EntityPatch<Product>;
    processes: EntityPatch<Process>;
    units: EntityPatch<Unit>;
  };
}

/** Minimal storage contract — matches the subset of `Storage` we use. */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function emptyEntityPatch<T>(): EntityPatch<T> {
  return { created: [], updated: {}, deletedIds: [] };
}

/** A fresh, empty overlay. */
export function emptyOverlay(): Overlay {
  return {
    version: OVERLAY_VERSION,
    formulas: emptyEntityPatch<Formula>(),
    lines: { upserts: {}, deletedKeys: [] },
    support: {
      materials: emptyEntityPatch<Material>(),
      plants: emptyEntityPatch<Plant>(),
      products: emptyEntityPatch<Product>(),
      processes: emptyEntityPatch<Process>(),
      units: emptyEntityPatch<Unit>(),
    },
  };
}

/** Coerce a possibly-partial/legacy patch into a complete EntityPatch. */
function normalizeEntityPatch<T>(p: unknown): EntityPatch<T> {
  const base = emptyEntityPatch<T>();
  if (!p || typeof p !== 'object') return base;
  const src = p as Partial<EntityPatch<T>>;
  return {
    created: Array.isArray(src.created) ? src.created : base.created,
    updated: src.updated && typeof src.updated === 'object' ? src.updated : base.updated,
    deletedIds: Array.isArray(src.deletedIds) ? src.deletedIds : base.deletedIds,
  };
}

/** Coerce any parsed JSON into a well-formed Overlay, tolerating legacy/nulls. */
export function normalizeOverlay(raw: unknown): Overlay {
  const base = emptyOverlay();
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as Record<string, unknown>;
  const support = (src.support && typeof src.support === 'object'
    ? (src.support as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const linesSrc = (src.lines && typeof src.lines === 'object'
    ? (src.lines as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  return {
    version: typeof src.version === 'number' ? src.version : OVERLAY_VERSION,
    formulas: normalizeEntityPatch<Formula>(src.formulas),
    lines: {
      upserts:
        linesSrc.upserts && typeof linesSrc.upserts === 'object'
          ? (linesSrc.upserts as Record<string, FormulaDetail>)
          : {},
      deletedKeys: Array.isArray(linesSrc.deletedKeys) ? (linesSrc.deletedKeys as string[]) : [],
    },
    support: {
      materials: normalizeEntityPatch<Material>(support.materials),
      plants: normalizeEntityPatch<Plant>(support.plants),
      products: normalizeEntityPatch<Product>(support.products),
      processes: normalizeEntityPatch<Process>(support.processes),
      units: normalizeEntityPatch<Unit>(support.units),
    },
  };
}
