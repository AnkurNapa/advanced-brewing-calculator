'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Card, SectionHeading } from '@/components/ui';
import { useUnitSystem } from '@/context/UnitSystemContext';
import { getSeed } from '@/lib/data/seedLoader';
import { repository } from '@/lib/data/repository';
import type { CompareFormSpec, Formula, SFormula } from '@/lib/data/types';
import {
  compareFormulaToSpec,
  type CompareResult,
} from '@/lib/compare/compareEngine';
import { ComparePicker, type PickerOption } from '@/components/compare/ComparePicker';
import { CompareTable } from '@/components/compare/CompareTable';

// ---------------------------------------------------------------------------
// Pure assembly helpers (kept module-level so the picker options + comparison
// are cheap useMemo derivations, not effects).
// ---------------------------------------------------------------------------

function plantName(id: number | null): string {
  return repository.plantById(id)?.Plantname ?? (id != null ? `Plant ${id}` : '—');
}

function productName(id: number | null): string {
  return repository.productById(id)?.ProductName ?? (id != null ? `Product ${id}` : '—');
}

function dateLabel(edateId: number | null): string {
  if (edateId == null) return '';
  const d = getSeed().dates.find((x) => x.EdateID === edateId);
  return d?.Edate ?? '';
}

function formulaOptions(formulas: readonly Formula[]): PickerOption[] {
  return formulas.map((f) => ({
    id: f.FormulaID,
    label: `#${f.FormulaID} · ${plantName(f.PlantID)} — ${productName(f.ProductID)}`,
    hint: dateLabel(f.EdateID) ? `Effective ${dateLabel(f.EdateID)}` : undefined,
  }));
}

function specOptions(specs: readonly SFormula[]): PickerOption[] {
  return specs.map((s) => ({
    id: s.formulaID,
    label: `#${s.formulaID} · ${plantName(s.plantID)} — ${productName(s.productID)}`,
  }));
}

/** Count how many of the 13 rules resolve for a Formula × Spec pairing. */
function resolvedCount(
  formulaId: number,
  specId: number,
  rules: readonly CompareFormSpec[],
): number {
  const fLines = repository.getFormulaLines(formulaId);
  const sLines = getSeed().sFormulaDetails.filter((l) => l.formulaID === specId);
  let n = 0;
  for (const r of rules) {
    const f = fLines.some(
      (l) => l.ProcessID === r.FProcessID && l.MaterialID === r.FMaterialID,
    );
    const s = sLines.some(
      (l) => l.processID === r.SProcessID && l.materialID === r.SAnalysisID,
    );
    if (f && s) n += 1;
  }
  return n;
}

/**
 * Pick the Formula × Spec pair that shares a Plant + Product and resolves the
 * most mapping rules — so the page opens on a working comparison.
 */
function bestDefaultPair(
  formulas: readonly Formula[],
  specs: readonly SFormula[],
  rules: readonly CompareFormSpec[],
): { formulaId: number; specId: number } {
  let best = { formulaId: formulas[0]?.FormulaID ?? 0, specId: specs[0]?.formulaID ?? 0, n: -1 };
  for (const f of formulas) {
    for (const s of specs) {
      if (f.PlantID !== s.plantID || f.ProductID !== s.productID) continue;
      const n = resolvedCount(f.FormulaID, s.formulaID, rules);
      if (n > best.n) best = { formulaId: f.FormulaID, specId: s.formulaID, n };
    }
  }
  return { formulaId: best.formulaId, specId: best.specId };
}

// ---------------------------------------------------------------------------
// Summary strip
// ---------------------------------------------------------------------------

function SummaryStat({ label, value, tone }: { label: string; value: number | string; tone?: 'success' | 'danger' | 'default' }) {
  const toneClass =
    tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-amber-900';
  return (
    <Card className="px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">
        {label}
      </p>
      <p className={`mt-0.5 font-display text-2xl font-bold ${toneClass}`}>{value}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

function CompareModule() {
  const { unitSystem } = useUnitSystem();

  const seed = getSeed();
  const rules = seed.compareFormSpec;
  const formulas = useMemo(() => repository.listFormulas(), []);
  const specs = seed.sFormula;

  const fOptions = useMemo(() => formulaOptions(formulas), [formulas]);
  const sOptions = useMemo(() => specOptions(specs), [specs]);

  const initial = useMemo(
    () => bestDefaultPair(formulas, specs, rules),
    [formulas, specs, rules],
  );

  const [formulaId, setFormulaId] = useState<number>(initial.formulaId);
  const [specId, setSpecId] = useState<number>(initial.specId);

  const result: CompareResult | null = useMemo(() => {
    const formula = formulas.find((f) => f.FormulaID === formulaId);
    const spec = specs.find((s) => s.formulaID === specId);
    if (!formula || !spec) return null;
    return compareFormulaToSpec({
      formula,
      spec,
      formulaLines: repository.getFormulaLines(formulaId),
      specLines: seed.sFormulaDetails.filter((l) => l.formulaID === specId),
      rules,
      units: seed.units,
      labelFor: (_rule, fLine, sLine) => {
        const text = sLine?.mtext?.trim() || fLine?.MText?.trim();
        if (text) return text;
        return repository.materialById(_rule.FMaterialID)?.MaterialName;
      },
    });
    // seed is a stable frozen singleton; only ids drive recomputation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formulaId, specId, formulas, specs, rules]);

  const driftCount = result
    ? result.matchedCount - result.withinToleranceCount
    : 0;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeading
        as="h1"
        eyebrow="Compare · 13 mapping rules"
        title="Formula vs Specification"
        description="Diff a recipe against its target specification. Each mapping rule checks one formula parameter against the matching spec analysis — normalized to base units before comparison, so mismatched display units never skew the result."
        actions={
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200 bg-parchment px-3 py-1.5 text-sm font-medium text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          >
            Back to modules
          </Link>
        }
      />

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ComparePicker
            eyebrow="Recipe"
            label="Formula"
            value={formulaId}
            options={fOptions}
            onChange={setFormulaId}
          />
          <ComparePicker
            eyebrow="Target"
            label="Specification"
            value={specId}
            options={sOptions}
            onChange={setSpecId}
          />
        </div>
      </Card>

      {result ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat label="Rules resolved" value={`${result.matchedCount}/${result.totalRules}`} />
            <SummaryStat label="Within tolerance" value={result.withinToleranceCount} tone="success" />
            <SummaryStat label="Out of spec" value={driftCount} tone={driftCount > 0 ? 'danger' : 'default'} />
            <SummaryStat label="Unmatched rules" value={result.unmatched.length} />
          </div>

          <section aria-label="Comparison detail">
            <CompareTable result={result} unitSystem={unitSystem} />
          </section>

          {result.unmatched.length > 0 ? (
            <Card className="p-5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-amber-600">
                Unmatched mapping rules ({result.unmatched.length})
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                These rules have no matching line on one or both sides for this
                pairing — reported, not dropped.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ink">
                {result.unmatched.map((u) => (
                  <li
                    key={`${u.sortfield}-${u.formulaProcessId}-${u.formulaMaterialId}-${u.specAnalysisId}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span className="font-medium">{u.label}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      {u.reason === 'no-formula-line'
                        ? 'no formula line'
                        : u.reason === 'no-spec-line'
                          ? 'no spec line'
                          : 'no line either side'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      ) : (
        <Card className="p-6">
          <p className="text-sm text-amber-800">
            Select a Formula and a Specification to compare.
          </p>
        </Card>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <AppShell>
      <CompareModule />
    </AppShell>
  );
}
