# Advanced Brewing Calculator

Pro-tier brewing **formulation / specification / compare** engine — a static,
client-side web app, companion to the Indian Brewing Calculator. All figures are
estimates for planning.

- Stack: Next.js 14 static export, React 18, TypeScript, Tailwind, Vitest, @visx.
- Deploy: GitHub Pages → https://ankurnapa.github.io/advanced-brewing-calculator
- Design spec: `docs/superpowers/specs/2026-07-20-advanced-brewing-calculator-design.md`

## Scripts
- `npm run dev` — local dev at `/`
- `npm run seed` — regenerate `src/lib/data/seed/*.json` from a local CSV export
  (set `SEED_SOURCE_DIR=/path/to/tables`)
- `npm test` — Vitest
- `npm run build` — static export to `out/`
