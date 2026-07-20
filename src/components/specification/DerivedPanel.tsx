'use client';

import { useState } from 'react';
import { Card, NumberField } from '@/components/ui';
import { srmToEbc, ebcToSrm } from '@/lib/engine';
import { useUnitSystem } from '@/context/UnitSystemContext';
import type { DerivedSpec, SpecTolerances } from '@/lib/specification/specDerive';

interface DerivedPanelProps {
  spec: DerivedSpec | null;
  error?: string;
}

const ML_PER_12FLOZ = 354.882;

function fmt(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

function withTolerance(value: string, tol: number | undefined, digits: number): string {
  if (tol === undefined || tol <= 0) return value;
  return `${value} ± ${tol.toFixed(digits)}`;
}

interface Tile {
  label: string;
  value: string;
  note?: string;
  emphasis?: boolean;
}

function buildTiles(spec: DerivedSpec, isMetric: boolean): Tile[][] {
  const t: SpecTolerances = spec.tolerances ?? {};

  const gravity: Tile[] = [
    {
      label: 'Original Gravity',
      value: withTolerance(`${fmt(spec.OG, 2)} °P`, t.dOG, 2),
      note: 'Original wort extract',
      emphasis: true,
    },
    {
      label: 'Real Extract',
      value: withTolerance(`${fmt(spec.RE, 3)} °P`, t.dRE, 3),
      note: 'True (dealcoholised) extract',
    },
    {
      label: 'Apparent Extract',
      value: `${fmt(spec.AE, 2)} °P`,
      note: 'Hydrometer reading',
    },
    {
      label: 'Beer Specific Gravity',
      value: withTolerance(fmt(spec.SG, 4), t.dSG, 4),
      note: '20/20 °C',
    },
  ];

  const alcohol: Tile[] = [
    {
      label: 'ABV (20 °C)',
      value: withTolerance(`${fmt(spec.ABV, 2)} % vol`, t.dABV, 2),
      note: 'Alcohol by volume',
      emphasis: true,
    },
    {
      label: 'ABW',
      value: withTolerance(`${fmt(spec.ABW, 3)} % w/w`, t.dALC, 3),
      note: 'Alcohol by weight',
    },
    {
      label: 'ABV (15.56 °C)',
      value: `${fmt(spec.ABV60, 2)} % vol`,
      note: 'At 60 °F',
    },
    {
      label: 'RDF',
      value: withTolerance(`${fmt(spec.RDF, 1)} %`, t.dRDF, 1),
      note: 'Real degree of fermentation',
    },
  ];

  const attenuation: Tile[] = [
    { label: 'RDA', value: `${fmt(spec.RDA, 1)} %`, note: 'Real attenuation' },
    { label: 'ADA', value: `${fmt(spec.ADA, 1)} %`, note: 'Apparent attenuation' },
    { label: 'E/A ratio', value: fmt(spec.EA, 2), note: 'Extract-to-alcohol' },
  ];

  // Nutrition: KB formulas are per 12 fl oz; convert to per-100 mL in metric.
  const per100 = (v: number) => (v * 100) / ML_PER_12FLOZ;
  const calValue = isMetric
    ? `${fmt(per100(spec.calories) * 4.184, 0)} kJ / 100 mL`
    : `${fmt(spec.calories, 0)} kcal / 12 fl oz`;
  const proteinValue = isMetric
    ? `${fmt(per100(spec.protein), 2)} g / 100 mL`
    : `${fmt(spec.protein, 2)} g / 12 fl oz`;
  const carbsValue = isMetric
    ? `${fmt(per100(spec.carbs), 2)} g / 100 mL`
    : `${fmt(spec.carbs, 2)} g / 12 fl oz`;

  const nutrition: Tile[] = [
    { label: 'Calories', value: calValue, note: 'Energy', emphasis: true },
    { label: 'Carbohydrate', value: carbsValue },
    { label: 'Protein', value: proteinValue, note: 'Estimated at 97 % malt' },
    { label: 'Ash', value: `${fmt(spec.ash, 2)} % w/w`, note: 'Default estimate' },
  ];

  return [gravity, alcohol, attenuation, nutrition];
}

function TileGrid({ title, tiles }: { title: string; tiles: Tile[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={
              tile.emphasis
                ? 'rounded-lg border border-teal-200 bg-teal-50/60 p-3'
                : 'rounded-lg border border-amber-200 bg-parchment p-3'
            }
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-amber-600">
              {tile.label}
            </p>
            <p className="mt-1 font-display text-lg font-bold tabular-nums text-amber-900">
              {tile.value}
            </p>
            {tile.note ? (
              <p className="mt-0.5 text-[11px] text-amber-700">{tile.note}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Small SRM ⇄ EBC converter — colour is reported alongside the analysis set. */
function ColorConverter({ isMetric }: { isMetric: boolean }) {
  const [srm, setSrm] = useState<number | ''>(8);
  const [ebc, setEbc] = useState<number | ''>(() => srmToEbc(8));

  const onSrm = (value: number | '') => {
    setSrm(value);
    setEbc(value === '' ? '' : Number(srmToEbc(value).toFixed(2)));
  };
  const onEbc = (value: number | '') => {
    setEbc(value);
    setSrm(value === '' ? '' : Number(ebcToSrm(value).toFixed(2)));
  };

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-600">
        Colour (SRM ⇄ EBC)
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="SRM"
          value={srm}
          onChange={onSrm}
          step={0.1}
          min={0}
          hint={isMetric ? undefined : 'Standard Reference Method'}
        />
        <NumberField
          label="EBC"
          value={ebc}
          onChange={onEbc}
          step={0.1}
          min={0}
          hint={isMetric ? 'European Brewery Convention' : undefined}
        />
      </div>
    </div>
  );
}

/** Full derived analysis panel: gravity, alcohol, attenuation, nutrition, colour. */
export function DerivedPanel({ spec, error }: DerivedPanelProps) {
  const { unitSystem } = useUnitSystem();
  const isMetric = unitSystem === 'metric';

  if (!spec) {
    return (
      <Card>
        <div className="p-6">
          <p className="text-sm text-amber-800" role="status">
            {error ?? 'Enter two analyses to derive the full specification.'}
          </p>
        </div>
      </Card>
    );
  }

  const groups = buildTiles(spec, isMetric);
  const titles = ['Gravity & extract', 'Alcohol', 'Attenuation', 'Nutrition (per serving)'];

  return (
    <Card>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800">
            Full analysis derived from your two inputs.
          </p>
          <span className="rounded-full border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-600">
            {spec.method === 'closed-form' ? 'closed form' : 'solved'}
          </span>
        </div>

        {groups.map((tiles, i) => (
          <TileGrid key={titles[i]} title={titles[i]} tiles={tiles} />
        ))}

        <ColorConverter isMetric={isMetric} />
      </div>
    </Card>
  );
}
