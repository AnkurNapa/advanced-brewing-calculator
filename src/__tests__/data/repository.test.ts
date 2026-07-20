/**
 * repository.test.ts — seed loading, overlay CRUD round-trips, line sorting,
 * and immutability of the underlying seed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Repository } from '@/lib/data/repository';
import { getSeed } from '@/lib/data/seedLoader';
import { OVERLAY_KEY } from '@/lib/data/overlay';
import type { FormulaDetail } from '@/lib/data/types';
import { fakeStorage } from './fakeStorage';

function makeRepo() {
  return new Repository(fakeStorage());
}

describe('seed loading', () => {
  it('loads seed tables with the expected row counts', () => {
    const seed = getSeed();
    expect(seed.materials).toHaveLength(35);
    expect(seed.formula).toHaveLength(6);
    expect(seed.formulaDetails).toHaveLength(59);
    expect(seed.plants).toHaveLength(2);
    expect(seed.process).toHaveLength(10);
  });

  it('lists formulas from seed when overlay is empty', () => {
    const repo = makeRepo();
    expect(repo.listFormulas()).toHaveLength(6);
    expect(repo.listMaterials()).toHaveLength(35);
  });
});

describe('formula CRUD round-trips through the overlay', () => {
  let repo: Repository;
  beforeEach(() => {
    repo = makeRepo();
  });

  it('creates a formula with a fresh id', () => {
    const created = repo.createFormula({ PlantID: 7, ProductID: 9 });
    expect(created.FormulaID).toBeGreaterThan(0);
    expect(repo.listFormulas()).toHaveLength(7);
    expect(repo.getFormula(created.FormulaID)?.PlantID).toBe(7);
  });

  it('updates a seed formula immutably', () => {
    const first = repo.listFormulas()[0];
    const before = getSeed().formula.find((f) => f.FormulaID === first.FormulaID)!;
    const beforeBU = before.BU;
    repo.updateFormula(first.FormulaID, { BU: 999 });
    expect(repo.getFormula(first.FormulaID)?.BU).toBe(999);
    // seed untouched
    expect(getSeed().formula.find((f) => f.FormulaID === first.FormulaID)!.BU).toBe(beforeBU);
  });

  it('updates a created formula in place', () => {
    const created = repo.createFormula({ PlantID: 1 });
    repo.updateFormula(created.FormulaID, { PlantID: 5 });
    expect(repo.getFormula(created.FormulaID)?.PlantID).toBe(5);
  });

  it('deletes a formula', () => {
    const id = repo.listFormulas()[0].FormulaID;
    repo.deleteFormula(id);
    expect(repo.getFormula(id)).toBeUndefined();
    expect(repo.listFormulas()).toHaveLength(5);
  });

  it('persists edits under the documented overlay key', () => {
    const storage = fakeStorage();
    const r = new Repository(storage);
    r.createFormula({ PlantID: 7 });
    expect(storage.getItem(OVERLAY_KEY)).not.toBeNull();
    // A second repo over the same storage sees the edit.
    const r2 = new Repository(storage);
    expect(r2.listFormulas()).toHaveLength(7);
  });
});

describe('formula lines', () => {
  it('sorts lines by process order then Qorder', () => {
    const repo = makeRepo();
    // pick a formula that actually has lines
    const withLines = getSeed().formulaDetails[0].FormulaID;
    const lines = repo.getFormulaLines(withLines);
    expect(lines.length).toBeGreaterThan(0);
    const order = repo.listProcesses().reduce<Map<number, number>>((m, p) => {
      m.set(p.ProcessID, p.ProcessOrder);
      return m;
    }, new Map());
    for (let i = 1; i < lines.length; i++) {
      const pa = order.get(lines[i - 1].ProcessID)!;
      const pb = order.get(lines[i].ProcessID)!;
      if (pa === pb) {
        expect((lines[i - 1].Qorder ?? 0) <= (lines[i].Qorder ?? 0)).toBe(true);
      } else {
        expect(pa).toBeLessThanOrEqual(pb);
      }
    }
  });

  it('upserts and deletes a line through the overlay', () => {
    const repo = makeRepo();
    const fid = getSeed().formulaDetails[0].FormulaID;
    const seedLine = repo.getFormulaLines(fid)[0];
    const edited: FormulaDetail = { ...seedLine, Fraction: 123.45 };
    repo.upsertLine(edited);
    expect(repo.getFormulaLines(fid).find((l) => l.MaterialID === seedLine.MaterialID)?.Fraction).toBe(123.45);

    repo.deleteLine(fid, seedLine.ProcessID, seedLine.MaterialID);
    expect(
      repo.getFormulaLines(fid).find(
        (l) => l.ProcessID === seedLine.ProcessID && l.MaterialID === seedLine.MaterialID,
      ),
    ).toBeUndefined();
  });
});

describe('immutability', () => {
  it('does not mutate the seed array on update', () => {
    const repo = makeRepo();
    const seedFormulas = getSeed().formula;
    const snapshot = seedFormulas.map((f) => f.BU);
    repo.updateFormula(seedFormulas[0].FormulaID, { BU: -1 });
    const after = getSeed().formula.map((f) => f.BU);
    expect(after).toEqual(snapshot);
  });

  it('resolvers return matching rows', () => {
    const repo = makeRepo();
    const m = repo.listMaterials()[0];
    expect(repo.materialById(m.MaterialID)?.MaterialName).toBe(m.MaterialName);
    expect(repo.materialById(null)).toBeUndefined();
  });
});
