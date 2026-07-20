'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, SectionHeading } from '@/components/ui';
import { useUnitSystem } from '@/context/UnitSystemContext';
import { useCatalog } from '@/hooks/useCatalog';
import { useFormulas } from '@/hooks/useFormulas';
import type { FormulaDetail } from '@/lib/data/types';
import {
  buildCalcContext,
  calculateForward,
  calculateBackward,
  type CalcDirection,
} from '@/lib/formulation/formulaCalc';
import { FormulaPicker } from '@/components/formulation/FormulaPicker';
import { ProcessGroup } from '@/components/formulation/ProcessGroup';
import { HeaderTargets } from '@/components/formulation/HeaderTargets';
import { OpstdReport } from '@/components/formulation/OpstdReport';

/**
 * /formulation — the Formula application: pick a recipe, edit its
 * parameter lines grouped by process step, run Calculate Forward/Backward through
 * the engine, and preview the printable OPSTD.
 */
export default function FormulationPage() {
  return (
    <AppShell mainClassName="mx-auto max-w-7xl px-4 py-6">
      <FormulationInner />
    </AppShell>
  );
}

function FormulationInner() {
  const { unitSystem } = useUnitSystem();
  const catalog = useCatalog();
  const {
    formulas,
    selectedId,
    selected,
    lines,
    select,
    createFormula,
    updateFormula,
    upsertLine,
    deleteLine,
    refresh,
  } = useFormulas();

  const [degraded, setDegraded] = useState<string[]>([]);
  const [showOpstd, setShowOpstd] = useState(false);

  const ctx = useMemo(
    () =>
      buildCalcContext({
        materials: catalog.materials,
        units: catalog.units,
        categories: catalog.categories,
        processes: catalog.processes,
      }),
    [catalog],
  );

  // Default-select the first seeded recipe on first load.
  useEffect(() => {
    if (selectedId == null && formulas.length > 0) select(formulas[0].FormulaID);
  }, [selectedId, formulas, select]);

  // Group the selected formula's lines by process, ordered by ProcessOrder.
  const groups = useMemo(() => {
    const byProcess = new Map<number, FormulaDetail[]>();
    for (const line of lines) {
      const list = byProcess.get(line.ProcessID) ?? [];
      list.push(line);
      byProcess.set(line.ProcessID, list);
    }
    return [...byProcess.entries()]
      .map(([processId, rows]) => ({
        processId,
        process: catalog.processById.get(processId),
        rows,
      }))
      .sort((a, b) => (a.process?.ProcessOrder ?? 0) - (b.process?.ProcessOrder ?? 0));
  }, [lines, catalog]);

  function runCalc(direction: CalcDirection) {
    if (!selected) return;
    const result =
      direction === 'forward'
        ? calculateForward(selected, lines, ctx)
        : calculateBackward(selected, lines, ctx);
    updateFormula(selected.FormulaID, result.formula);
    for (const line of result.lines) upsertLine(line);
    setDegraded(result.meta.degraded);
    refresh();
  }

  function handleNew() {
    const created = createFormula({});
    select(created.FormulaID);
    setDegraded([]);
    setShowOpstd(false);
  }

  function handleChangeLine(line: FormulaDetail, patch: Partial<FormulaDetail>) {
    upsertLine({ ...line, ...patch });
    refresh();
  }

  function handleRemoveLine(line: FormulaDetail) {
    deleteLine(line.FormulaID, line.ProcessID, line.MaterialID);
    refresh();
  }

  function handleAddLine(processId: number, materialId: number) {
    if (!selected) return;
    const material = catalog.materialById.get(materialId);
    const maxOrder = lines.reduce((m, l) => Math.max(m, l.Qorder ?? 0), 0);
    upsertLine({
      FormulaID: selected.FormulaID,
      ProcessID: processId,
      MaterialID: materialId,
      TransferID: null,
      FUnitID: material?.UnitID ?? null,
      FInUnitID: material?.InUnitID ?? null,
      Qorder: maxOrder + 1,
      MText: null,
      Fraction: 0,
      Quantity: null,
      Qtext: '',
      Qround: 0,
      Extract: material?.MatlExt ?? null,
      Yield: material?.MatlYld ?? null,
      Ferment: material?.MatlFerm ?? null,
      Qopstd: null,
      Uopstd: null,
      PR3a: null,
      OG2a: null,
      Bbl2a: null,
      SRM: null,
      Revision: null,
    });
    refresh();
  }

  return (
    <>
      <SectionHeading
        eyebrow="Formulation"
        title="Recipe & Operating Standard"
        description="Edit parameter lines by process step, then Calculate Forward (targets → quantities) or Backward (quantities → targets)."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <FormulaPicker
            formulas={formulas}
            catalog={catalog}
            selectedId={selectedId}
            onSelect={(id) => {
              select(id);
              setShowOpstd(false);
              setDegraded([]);
            }}
            onNew={handleNew}
          />
        </aside>

        <div className="min-w-0 space-y-5">
          {!selected ? (
            <Card className="p-6 text-amber-700">Select a recipe to begin.</Card>
          ) : (
            <>
              <div className="rounded-xl border border-amber-200 bg-parchment p-3">
                <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Calculation actions">
                  <Button
                    onClick={() => runCalc('forward')}
                    title="Compute ingredient quantities from your target gravity, volume, colour and bitterness."
                  >
                    Calculate forward
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => runCalc('backward')}
                    title="Work the other way: derive the target values from the ingredient quantities you entered."
                  >
                    Calculate backward
                  </Button>
                  <span className="mx-1 hidden w-px self-stretch bg-amber-200 sm:block" aria-hidden />
                  <Button variant="ghost" onClick={() => refresh()} title="Re-sort lines by process order.">
                    Sort lines
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowOpstd((v) => !v)}
                    title="Preview and print the operating standard for the brewhouse."
                  >
                    {showOpstd ? 'Back to recipe' : 'Preview / print OPSTD'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-amber-700">
                  <span className="font-semibold text-amber-800">Forward</span> targets → ingredient
                  amounts. <span className="font-semibold text-amber-800">Backward</span> amounts →
                  targets. Edit any line below, then recalculate.
                </p>
              </div>

              <HeaderTargets formula={selected} unitSystem={unitSystem} degraded={degraded} />

              {showOpstd ? (
                <OpstdReport
                  formula={selected}
                  lines={lines}
                  catalog={catalog}
                  unitSystem={unitSystem}
                  onClose={() => setShowOpstd(false)}
                />
              ) : (
                <div className="space-y-4">
                  {groups.length === 0 ? (
                    <Card className="p-6 text-amber-700">
                      This recipe has no parameter lines yet.
                    </Card>
                  ) : (
                    groups.map(({ processId, process, rows }) => (
                      <ProcessGroup
                        key={processId}
                        process={process}
                        processId={processId}
                        lines={rows}
                        catalog={catalog}
                        ctx={ctx}
                        unitSystem={unitSystem}
                        onChangeLine={handleChangeLine}
                        onRemoveLine={handleRemoveLine}
                        onAddLine={handleAddLine}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
