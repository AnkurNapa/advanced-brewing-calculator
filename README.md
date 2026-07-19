# Advanced Brewing Calculator

Pro-tier brewing **formulation / specification / compare** engine — a modern static
rebuild of the Master Brewers Toolbox (James Hackbarth / MBAA), companion to the
Indian Brewing Calculator.

- Stack: Next.js 14 static export, React 18, TypeScript, Tailwind, Vitest, @visx.
- Deploy: GitHub Pages → https://ankurnapa.github.io/advanced-brewing-calculator
- Design spec: `docs/superpowers/specs/2026-07-20-advanced-brewing-calculator-design.md`
- Calc source of truth: Obsidian vault `MasterBrewers_Export/MasterBrewers_KB/`

## Scripts
- `npm run dev` — local dev at `/`
- `npm run seed` — regenerate `src/lib/data/seed/*.json` from the vault CSV tables
- `npm test` — Vitest
- `npm run build` — static export to `out/`
