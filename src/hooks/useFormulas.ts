/**
 * useFormulas.ts
 * React hook for the formula list, a selected formula + its (sorted) lines,
 * and mutation callbacks that re-read the repository after each write so the
 * UI reflects the new overlay state.
 */

'use client';

import { useCallback, useMemo, useState } from 'react';
import { repository as defaultRepository, Repository } from '@/lib/data/repository';
import type { Formula, FormulaDetail } from '@/lib/data/types';

export interface UseFormulas {
  formulas: Formula[];
  selectedId: number | null;
  selected: Formula | undefined;
  lines: FormulaDetail[];
  select: (id: number | null) => void;
  createFormula: (partial: Partial<Formula>) => Formula;
  updateFormula: (id: number, patch: Partial<Formula>) => Formula | undefined;
  deleteFormula: (id: number) => void;
  upsertLine: (line: FormulaDetail) => FormulaDetail;
  deleteLine: (formulaId: number, processId: number, materialId: number) => void;
  refresh: () => void;
}

export function useFormulas(repo: Repository = defaultRepository): UseFormulas {
  const [version, setVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const formulas = useMemo(() => repo.listFormulas(), [repo, version]);
  const selected = useMemo(
    () => (selectedId == null ? undefined : repo.getFormula(selectedId)),
    [repo, selectedId, version],
  );
  const lines = useMemo(
    () => (selectedId == null ? [] : repo.getFormulaLines(selectedId)),
    [repo, selectedId, version],
  );

  const select = useCallback((id: number | null) => setSelectedId(id), []);

  const createFormula = useCallback(
    (partial: Partial<Formula>) => {
      const created = repo.createFormula(partial);
      setSelectedId(created.FormulaID);
      refresh();
      return created;
    },
    [repo, refresh],
  );

  const updateFormula = useCallback(
    (id: number, patch: Partial<Formula>) => {
      const result = repo.updateFormula(id, patch);
      refresh();
      return result;
    },
    [repo, refresh],
  );

  const deleteFormula = useCallback(
    (id: number) => {
      repo.deleteFormula(id);
      setSelectedId((cur) => (cur === id ? null : cur));
      refresh();
    },
    [repo, refresh],
  );

  const upsertLine = useCallback(
    (line: FormulaDetail) => {
      const result = repo.upsertLine(line);
      refresh();
      return result;
    },
    [repo, refresh],
  );

  const deleteLine = useCallback(
    (formulaId: number, processId: number, materialId: number) => {
      repo.deleteLine(formulaId, processId, materialId);
      refresh();
    },
    [repo, refresh],
  );

  return {
    formulas,
    selectedId,
    selected,
    lines,
    select,
    createFormula,
    updateFormula,
    deleteFormula,
    upsertLine,
    deleteLine,
    refresh,
  };
}
