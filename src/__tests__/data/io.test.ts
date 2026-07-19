/**
 * io.test.ts — export -> import round-trips and replace-vs-merge semantics.
 */
import { describe, it, expect } from 'vitest';
import { Repository } from '@/lib/data/repository';
import { exportAll, importAll } from '@/lib/data/io';
import { fakeStorage } from './fakeStorage';

function makeRepo() {
  return new Repository(fakeStorage());
}

describe('export / import round-trip', () => {
  it('round-trips user edits into a fresh repository', () => {
    const source = makeRepo();
    const created = source.createFormula({ PlantID: 7, ProductID: 9, BU: 42 });
    source.updateFormula(source.listFormulas()[0].FormulaID, { BU: 500 });
    const json = exportAll(source);

    const target = makeRepo();
    expect(target.listFormulas()).toHaveLength(50);
    importAll(json, { mode: 'replace' }, target);

    expect(target.listFormulas()).toHaveLength(51);
    expect(target.getFormula(created.FormulaID)?.BU).toBe(42);
  });

  it('produces a versioned envelope', () => {
    const repo = makeRepo();
    repo.createFormula({ PlantID: 1 });
    const parsed = JSON.parse(exportAll(repo));
    expect(parsed.app).toBe('advanced-brewing-calculator');
    expect(parsed.kind).toBe('overlay');
    expect(parsed.overlay.formulas.created).toHaveLength(1);
  });

  it('merges by default without dropping existing edits', () => {
    const target = makeRepo();
    const a = target.createFormula({ FormulaID: 8001, PlantID: 1 });

    const other = makeRepo();
    const b = other.createFormula({ FormulaID: 8002, PlantID: 2 });
    const json = exportAll(other);

    importAll(json, { mode: 'merge' }, target);
    expect(target.getFormula(a.FormulaID)).toBeDefined();
    expect(target.getFormula(b.FormulaID)).toBeDefined();
  });

  it('replace mode overwrites existing overlay', () => {
    const target = makeRepo();
    const a = target.createFormula({ FormulaID: 9001, PlantID: 1 });

    const other = makeRepo();
    other.createFormula({ FormulaID: 9002, PlantID: 2 });
    const json = exportAll(other);

    importAll(json, { mode: 'replace' }, target);
    expect(target.getFormula(a.FormulaID)).toBeUndefined();
    expect(target.listFormulas()).toHaveLength(51);
  });

  it('tolerates a bare overlay object without the envelope', () => {
    const source = makeRepo();
    source.createFormula({ PlantID: 3 });
    const overlayOnly = JSON.stringify(source.getOverlay());
    const target = makeRepo();
    importAll(overlayOnly, { mode: 'replace' }, target);
    expect(target.listFormulas()).toHaveLength(51);
  });

  it('throws on malformed JSON', () => {
    const target = makeRepo();
    expect(() => importAll('{not json', {}, target)).toThrow();
  });
});
