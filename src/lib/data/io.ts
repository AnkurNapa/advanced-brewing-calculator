/**
 * io.ts
 * Import/export of the user-edit overlay. `exportAll` serializes the whole
 * overlay to a JSON string (+ browser download helper). `importAll` validates
 * the shape and merges (or replaces) it into the repository's overlay.
 */

import { Repository, repository as defaultRepository } from './repository';
import { OVERLAY_VERSION, normalizeOverlay, emptyOverlay } from './overlay';
import type { EntityPatch, Overlay } from './overlay';

/** Envelope written to disk so imports can be identified + versioned. */
export interface ExportEnvelope {
  app: 'advanced-brewing-calculator';
  kind: 'overlay';
  version: number;
  exportedAt: string;
  overlay: Overlay;
}

/** Serialize the current overlay to a pretty JSON string. */
export function exportAll(repo: Repository = defaultRepository): string {
  const envelope: ExportEnvelope = {
    app: 'advanced-brewing-calculator',
    kind: 'overlay',
    version: OVERLAY_VERSION,
    exportedAt: new Date().toISOString(),
    overlay: repo.getOverlay(),
  };
  return JSON.stringify(envelope, null, 2);
}

/** Trigger a browser download of the export JSON (no-op under SSR). */
export function downloadAll(
  filename = 'brewing-data.json',
  repo: Repository = defaultRepository,
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([exportAll(repo)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ImportOptions {
  /** 'replace' overwrites the overlay; 'merge' unions patches (default). */
  mode?: 'replace' | 'merge';
}

/** Parse a raw JSON string into a normalized Overlay, tolerating envelopes. */
function parseOverlay(json: string): Overlay {
  const parsed: unknown = JSON.parse(json);
  if (parsed && typeof parsed === 'object' && 'overlay' in (parsed as Record<string, unknown>)) {
    return normalizeOverlay((parsed as { overlay: unknown }).overlay);
  }
  return normalizeOverlay(parsed);
}

/** Union two entity patches (incoming wins on key collisions). */
function mergePatch<T>(base: EntityPatch<T>, incoming: EntityPatch<T>, idOf: (r: T) => number): EntityPatch<T> {
  const createdById = new Map<number, T>();
  for (const r of base.created) createdById.set(idOf(r), r);
  for (const r of incoming.created) createdById.set(idOf(r), r);
  return {
    created: [...createdById.values()],
    updated: { ...base.updated, ...incoming.updated },
    deletedIds: [...new Set([...base.deletedIds, ...incoming.deletedIds])],
  };
}

/** Merge two full overlays (incoming wins on collisions). */
function mergeOverlays(base: Overlay, incoming: Overlay): Overlay {
  return {
    version: OVERLAY_VERSION,
    formulas: mergePatch(base.formulas, incoming.formulas, (f) => f.FormulaID),
    lines: {
      upserts: { ...base.lines.upserts, ...incoming.lines.upserts },
      deletedKeys: [...new Set([...base.lines.deletedKeys, ...incoming.lines.deletedKeys])],
    },
    support: {
      materials: mergePatch(base.support.materials, incoming.support.materials, (m) => m.MaterialID),
      plants: mergePatch(base.support.plants, incoming.support.plants, (p) => p.PlantID),
      products: mergePatch(base.support.products, incoming.support.products, (p) => p.ProductID),
      processes: mergePatch(base.support.processes, incoming.support.processes, (p) => p.ProcessID),
      units: mergePatch(base.support.units, incoming.support.units, (u) => u.UnitID),
    },
  };
}

/**
 * Validate + apply an import. Returns the resulting overlay.
 * Throws on malformed JSON so the UI can surface a clear error.
 */
export function importAll(
  json: string,
  options: ImportOptions = {},
  repo: Repository = defaultRepository,
): Overlay {
  const mode = options.mode ?? 'merge';
  const incoming = parseOverlay(json);
  const result = mode === 'replace' ? incoming : mergeOverlays(repo.getOverlay(), incoming);
  repo.setOverlay(result);
  return result;
}

/** Exposed for tests / callers that need a blank overlay. */
export { emptyOverlay };
