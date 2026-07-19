/**
 * Gravity / alcohol / extract library.
 * Source: MasterBrewers_KB/04_Calculations_Reference.md §2, §14, §15, §16
 * (BrewHelp_Calculations.txt Chapter 3 pp.39-41 and Chapter 4 pp.65-72).
 *
 * All polynomial coefficients are transcribed verbatim from the KB.
 */

// ---------------------------------------------------------------------------
// §15 fSGE — specific gravity from extract (°Plato), 20/20 °C, in vacuo.
// AOAC sucrose table, 10th-order PLS fit (adjR^2=1.0, SE=1.6e-6).
// ---------------------------------------------------------------------------
const SGE_COEFF: number[] = [
  0, // index 0 unused (k starts at 1)
  0.3875135555, // m1
  0.09702881653, // m2
  0.3883357480, // m3
  -1.782845295, // m4
  5.591472292, // m5
  -11.00667976, // m6
  13.62230734, // m7
  -10.33082001, // m8
  4.387787019, // m9
  -0.7995558730, // m10
];

/**
 * fSGE(Plato, dPlato, t) — SG from extract.
 * t=1: value; t=2: derivative w.r.t. Plato scaled by dPlato (uncertainty propagation).
 */
export function fSGE(plato: number, dPlato = 0, t: 1 | 2 = 1): number {
  const E = plato / 100;
  const dE = dPlato / 100;
  if (t === 1) {
    let sum = 1;
    for (let k = 1; k <= 10; k++) {
      sum += SGE_COEFF[k] * E ** k;
    }
    return sum;
  }
  let sum = 0;
  for (let k = 1; k <= 10; k++) {
    sum += SGE_COEFF[k] * k * dE * E ** (k - 1);
  }
  return sum;
}

// ---------------------------------------------------------------------------
// §15 fSGA — specific gravity from ethanol (% w/w), OIML alcohol tables,
// 11th-order fit (divided by m0).
// ---------------------------------------------------------------------------
const SGA_M0 = 0.99820123;
const SGA_COEFF: number[] = [
  0,
  -0.1929769495, // m1
  0.3891238958, // m2
  -1.668103923, // m3
  13.52215441, // m4
  -88.29278388, // m5
  306.2874042, // m6
  -613.8381234, // m7
  747.0172998, // m8
  -547.8461354, // m9
  223.4460334, // m10
  -39.03285426, // m11
];

/** fSGA(ALC, dALC, t) — SG from ethanol % w/w. */
export function fSGA(alc: number, dAlc = 0, t: 1 | 2 = 1): number {
  const A = alc / 100;
  const dA = dAlc / 100;
  if (t === 1) {
    let sum = 1;
    for (let k = 1; k <= 11; k++) {
      sum += (SGA_COEFF[k] / SGA_M0) * A ** k;
    }
    return sum;
  }
  let sum = 0;
  for (let k = 1; k <= 11; k++) {
    sum += (SGA_COEFF[k] / SGA_M0) * k * dA * A ** (k - 1);
  }
  return sum;
}

/**
 * SGA60 — SG of an alcohol/water mixture at 15.56 °C (60 °F), used for the ABV-at-60F
 * conversion (§19). The KB states this "uses the OIML alcohol equation at 15.56 C" but
 * does not transcribe separate 15.56 °C polynomial coefficients (BrewHelp_Calculations.txt
 * line ~1829 has an empty function body). TODO: obtain the 15.56 °C OIML coefficients;
 * until then this approximates using the 20/20 °C fSGA curve, which is close
 * (fSGA(4.349)=0.99223 vs KB-reported SGA60(4.349)=0.992265).
 */
export function SGA60(abw: number): number {
  return fSGA(abw, 0, 1);
}

// ---------------------------------------------------------------------------
// §2 / §1 lbbl / P — extract weight <-> Plato
// ---------------------------------------------------------------------------

/** lbs extract per barrel from °Plato (% w/w, 20/20 °C). */
export function lbbl(plato: number): number {
  return 2.5824239 * plato * fSGE(plato, 0, 1);
}

/**
 * Inverse of lbbl(): lbs extract/bbl -> °Plato, via Newton iteration (<=20 loops, tol 1e-5).
 * Seed from the closed-form inverse approximation given in the KB.
 */
export function P(lbblx: number): number {
  if (lbblx === 0) return 0;
  let p = 1 / (2.5824 / lbblx + 0.0038715 - 0.00000072431 * lbblx);
  for (let i = 0; i < 20; i++) {
    const pPrev = p;
    const derivative = (lbbl(p + 1) - lbbl(p - 1)) / 2;
    p = p - (lbbl(p) - lbblx) / derivative;
    if (Math.abs(p - pPrev) < 1e-5) {
      return p;
    }
  }
  return p;
}

// ---------------------------------------------------------------------------
// §15 dH2O / bblwt — water density and barrel weight.
// ---------------------------------------------------------------------------
const DH2O_COEFF = [
  0.99984,
  6.6426789549522e-5,
  -8.82145582592819e-6,
  8.42662026620399e-8,
  -7.67668441764965e-10,
  4.34411296962468e-12,
  -1.08648102861124e-14,
];

/** Density of water (g/mL) at tempC, Anton Paar DMA5000 fit, 0-100.9 °C. */
export function dH2O(tempC: number): number {
  let sum = 0;
  for (let k = 1; k <= 7; k++) {
    sum += DH2O_COEFF[k - 1] * tempC ** (k - 1);
  }
  return sum;
}

/** Weight (lbs) of a barrel (31 US gal) of water at temperature F. */
export function bblwt(tempF: number): number {
  const tempC = ((tempF - 32) * 5) / 9;
  const raw = 3.785412 * 2.20462 * 31 * dH2O(tempC);
  return Math.round(raw * 100) / 100;
}

// ---------------------------------------------------------------------------
// §14 REx / ALx — real extract & alcohol from OG + RDF.
// ---------------------------------------------------------------------------

/** Real extract (RE) or its uncertainty (dRE) from OG, dOG, RDF, dRDF. t=1 value, t=2 uncertainty. */
export function REx(og: number, dOg: number, rdf: number, dRdf: number, t: 1 | 2 = 1): number {
  const denom = 100 - 0.005161 * og * rdf;
  const RE = (og * (100 - rdf)) / denom;
  if (t === 1) return RE;
  const dRE = Math.abs(
    (100 * dOg + (0.005161 * RE - 1) * (rdf * dOg - og * dRdf)) / denom
  );
  return dRE;
}

/** Alcohol (ALC) or its uncertainty (dALC) from OG, dOG, RDF, dRDF. t=1 value, t=2 uncertainty. */
export function ALx(og: number, dOg: number, rdf: number, dRdf: number, t: 1 | 2 = 1): number {
  const denom = 100 - 0.005161 * og * rdf;
  const ALC = (0.4839 * og * rdf) / denom;
  if (t === 1) return ALC;
  const dALC = Math.abs(((0.4839 + 0.005161 * ALC) * (og * dRdf + rdf * dOg)) / denom);
  return dALC;
}

// ---------------------------------------------------------------------------
// §16 SGBeer — Hackbarth ternary solute-interaction model.
// ---------------------------------------------------------------------------

/** Z interaction residual term (extract E % w/w, alcohol A % w/w). */
function zInteraction(E: number, A: number): number {
  return (
    -1.020733575e-2 * E * A ** 0.5 +
    7.234029153e-3 * E * A -
    4.496851490e-4 * E * A ** 2 +
    9.045618812e-6 * E * A ** 3 -
    5.427265684e-8 * E * A ** 4 +
    6.223951696e-4 * E ** 2 * A ** 0.5 -
    1.719663278e-4 * E ** 2 * A -
    3.463023825e-6 * E ** 3 * A ** 0.5 +
    2.302760700e-9 * E ** 3 * A ** 3
  );
}

/** Beer specific gravity from real extract (RE) and alcohol (ALC), both % w/w. */
export function SGBeer(re: number, alc: number): number {
  const E = re;
  const A = alc;
  const Z = zInteraction(E, A);
  const Eb = (E * 100) / (100 - A) + Z;
  const Ab = (A * 100) / (100 - E) + Z;
  const SGWE = (100 - Eb) / (100 / fSGE(Eb, 0, 1) - Eb / fSGE(100, 0, 1));
  const SGWA = (100 - Ab) / (100 / fSGA(Ab, 0, 1) - Ab / fSGA(100, 0, 1));
  const SGW = SGWE * SGWA;
  return 100 / (E / fSGE(100, 0, 1) + A / fSGA(100, 0, 1) + (100 - E - A) / SGW);
}

/**
 * SGBeerx(OG, dOG, RDF, dRDF, t) — beer SG (and uncertainty) computed directly from OG/RDF
 * via REx/ALx, matching the KB's central-difference uncertainty propagation.
 */
export function SGBeerx(og: number, dOg: number, rdf: number, dRdf: number, t: 1 | 2 = 1): number {
  const sgCenter = SGBeer(REx(og, 0, rdf, 0, 1), ALx(og, 0, rdf, 0, 1));
  if (t === 1) return sgCenter;
  const sg3 = SGBeer(
    REx(og + dOg, 0, rdf - dRdf, 0, 1),
    ALx(og + dOg, 0, rdf - dRdf, 0, 1)
  );
  const sg1 = SGBeer(
    REx(og - dOg, 0, rdf + dRdf, 0, 1),
    ALx(og - dOg, 0, rdf + dRdf, 0, 1)
  );
  return Math.abs((sg3 - sg1) / 2);
}

// ---------------------------------------------------------------------------
// §16 fAE — apparent extract (Plato) from SG, Newton-Raphson.
// ---------------------------------------------------------------------------

/** Apparent extract (AE, °Plato) or its uncertainty (dAE) from SG, dSG. t=1 value, t=2 uncertainty. */
export function fAE(sg: number, dSg = 0, t: 1 | 2 = 1): number {
  let AE = (100 * (sg - 1)) / (1.5545 - 1);
  const dAE = (100 * dSg) / (1.5545 - 1);
  for (let i = 0; i < 50; i++) {
    const delta = (fSGE(AE, 0, 1) - sg) / fSGE(AE, 1, 2);
    AE = AE - delta;
    if (Math.abs(delta) < 1e-5) break;
  }
  if (t === 1) return AE;
  return dAE;
}
