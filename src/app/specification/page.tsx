'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Card, SectionHeading } from '@/components/ui';
import {
  AnalysisInputs,
  type AnalysisSlot,
} from '@/components/specification/AnalysisInputs';
import { DerivedPanel } from '@/components/specification/DerivedPanel';
import { SpecList } from '@/components/specification/SpecList';
import {
  ANALYSIS_META,
  deriveSpec,
  isRedundantPair,
  type AnalysisKey,
  type KnownAnalysis,
} from '@/lib/specification/specDerive';

type Slots = [AnalysisSlot, AnalysisSlot];

function initialSlots(): Slots {
  return [
    { key: 'OG', value: ANALYSIS_META.OG.defaultValue, tolerance: '' },
    { key: 'RDF', value: ANALYSIS_META.RDF.defaultValue, tolerance: '' },
  ];
}

export default function SpecificationPage() {
  const [slots, setSlots] = useState<Slots>(initialSlots);
  const [showTolerance, setShowTolerance] = useState(false);

  const updateSlot = (index: 0 | 1, patch: Partial<AnalysisSlot>) => {
    setSlots((prev) => {
      const next: Slots = [{ ...prev[0] }, { ...prev[1] }];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleKeyChange = (index: 0 | 1, key: AnalysisKey) => {
    const other = slots[index === 0 ? 1 : 0].key;
    if (isRedundantPair(key, other)) return;
    updateSlot(index, { key, value: ANALYSIS_META[key].defaultValue, tolerance: '' });
  };

  const result = useMemo(() => {
    const inputs: KnownAnalysis[] = slots.map((slot) => ({
      key: slot.key,
      value: slot.value === '' ? Number.NaN : slot.value,
      tolerance:
        showTolerance && slot.tolerance !== '' ? slot.tolerance : undefined,
    }));
    return deriveSpec(inputs);
  }, [slots, showTolerance]);

  return (
    <AppShell>
      <SectionHeading
        as="h1"
        eyebrow="Specification · Ch.4 engine"
        title="Spec calculator"
        description="Enter any two analyses you know and derive the complete specification — real and apparent extract, ABV, RDF, attenuation, calories and more."
        actions={
          <Link
            href="/"
            className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-800 hover:border-amber-400 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Back to modules
          </Link>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <Card>
          <div className="p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-amber-900">
              Known analyses
            </h2>
            <AnalysisInputs
              slots={slots}
              showTolerance={showTolerance}
              onKeyChange={handleKeyChange}
              onValueChange={(index, value) => updateSlot(index, { value })}
              onToleranceChange={(index, tolerance) =>
                updateSlot(index, { tolerance })
              }
              onToggleTolerance={setShowTolerance}
            />
          </div>
        </Card>

        <DerivedPanel
          spec={result.ok ? result.spec : null}
          error={result.ok ? undefined : result.reason}
        />
      </div>

      <section aria-labelledby="spec-library" className="mt-12">
        <h2
          id="spec-library"
          className="font-display text-sm font-semibold uppercase tracking-widest text-amber-600"
        >
          Seeded specification library
        </h2>
        <div className="mt-4">
          <SpecList />
        </div>
      </section>
    </AppShell>
  );
}
