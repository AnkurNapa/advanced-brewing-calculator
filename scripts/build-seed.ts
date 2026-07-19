/**
 * build-seed.ts — convert the real Master Brewers Toolbox tables (exported from
 * brewdat.mdb / brewapp2013N.mdb as CSV in the Obsidian vault) into typed JSON
 * that the static app bundles as read-only seed data. localStorage overlays user
 * edits on top of this at runtime (see src/lib/data/repository.ts).
 *
 * Run: npm run seed
 * Source: /Users/ankurnapa/Documents/obsidian/MasterBrewers_Export/tables/*.csv
 * Output: src/lib/data/seed/*.json
 */
import { parse } from 'csv-parse/sync';
import fs from 'node:fs';
import path from 'node:path';

const TABLES_DIR =
  '/Users/ankurnapa/Documents/obsidian/MasterBrewers_Export/tables';
const OUT_DIR = path.resolve(__dirname, '../src/lib/data/seed');

/** Read one `brewdat__X.csv`, coercing numeric-looking cells to numbers. */
function readTable(file: string): Record<string, unknown>[] {
  const raw = fs.readFileSync(path.join(TABLES_DIR, file), 'utf8');
  const rows = parse(raw, {
    bom: true,
    columns: (header: string[]) => header.map((h) => h.trim()),
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  }) as Record<string, string>[];
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v === '' || v == null) {
        out[k] = null;
      } else if (/^-?\d+(\.\d+)?$/.test(v)) {
        out[k] = Number(v);
      } else if (v === 'True' || v === 'False') {
        out[k] = v === 'True';
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

const TABLE_MAP: Record<string, string> = {
  baseUnits: 'brewdat__BaseUnits.csv',
  units: 'brewdat__units.csv',
  inUnits: 'brewdat__InUnits.csv',
  category: 'brewdat__Category.csv',
  materials: 'brewdat__Materials.csv',
  plants: 'brewdat__Plants.csv',
  products: 'brewdat__Products.csv',
  process: 'brewdat__Process.csv',
  dates: 'brewdat__Dates.csv',
  transfer: 'brewdat__Transfer.csv',
  losses: 'brewdat__Losses.csv',
  prices: 'brewdat__Prices.csv',
  formula: 'brewdat__Formula.csv',
  formulaDetails: 'brewdat__FormulaDetails.csv',
  blend: 'brewdat__Blend.csv',
  sFormula: 'brewdat__SFormula.csv',
  sFormulaDetails: 'brewdat__SFormulaDetails.csv',
  sMaterials: 'brewdat__SMaterials.csv',
  sCategory: 'brewdat__SCategory.csv',
  compareFormSpec: 'brewapp__CompareFormSpec.csv',
  area: 'brewapp__Area.csv',
};

function main(): void {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest: Record<string, number> = {};
  for (const [name, file] of Object.entries(TABLE_MAP)) {
    const rows = readTable(file);
    fs.writeFileSync(
      path.join(OUT_DIR, `${name}.json`),
      JSON.stringify(rows, null, 0),
    );
    manifest[name] = rows.length;
    console.log(`  ${name.padEnd(16)} ${rows.length} rows`);
  }
  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  console.log(`\nSeed written to ${OUT_DIR}`);
}

main();
