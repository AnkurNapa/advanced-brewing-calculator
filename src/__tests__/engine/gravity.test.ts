import { describe, it, expect } from 'vitest';
import {
  fSGE,
  fSGA,
  dH2O,
  bblwt,
  lbbl,
  P,
  REx,
  ALx,
  SGBeer,
  SGBeerx,
  fAE,
  SGA60,
} from '@/lib/engine/gravity';

describe('gravity engine', () => {
  describe('fSGE', () => {
    it('equals 1 at 0 Plato (pure water)', () => {
      expect(fSGE(0)).toBeCloseTo(1, 6);
    });

    it('is monotonic increasing over the practical brewing range', () => {
      const points = [0, 2, 5, 8, 10, 12, 14, 16, 20, 24];
      for (let i = 1; i < points.length; i++) {
        expect(fSGE(points[i])).toBeGreaterThan(fSGE(points[i - 1]));
      }
    });

    it('matches the KB worked SGE for RE=4.771 -> ~1.0187 range sanity', () => {
      // KB: SGE = fSGE(4.771, 0.223, 1) referenced downstream at 1.018743 for OG-based case;
      // sanity check the raw extract curve is in a believable band for low-gravity beer.
      expect(fSGE(4.771)).toBeGreaterThan(1.0);
      expect(fSGE(4.771)).toBeLessThan(1.03);
    });

    it('gives SG near 1.048 for a ~12 Plato wort (sanity)', () => {
      expect(fSGE(12)).toBeCloseTo(1.048, 2);
    });
  });

  describe('fSGA', () => {
    it('equals 1 at 0% alcohol', () => {
      expect(fSGA(0)).toBeCloseTo(1, 6);
    });

    it('decreases as alcohol % increases (ethanol is less dense than water)', () => {
      expect(fSGA(10)).toBeLessThan(fSGA(0));
      expect(fSGA(50)).toBeLessThan(fSGA(10));
    });
  });

  describe('dH2O / bblwt', () => {
    it('bblwt(172F) === 251.76 (KB correctness gate)', () => {
      expect(bblwt(172)).toBeCloseTo(251.76, 2);
    });

    it('bblwt(64F) matches the KB Brewhouse Efficiency worked example (~258.35 lb, i.e. bblwt(64)/258.24=1.0014)', () => {
      const w = bblwt(64);
      expect(w / 258.24).toBeCloseTo(1.0014, 2);
    });

    it('bblwt(157F) matches the KB mash-weight worked example (253.04 lb)', () => {
      expect(bblwt(157)).toBeCloseTo(253.04, 2);
    });

    it('dH2O(0) is close to the fit intercept 0.99984', () => {
      expect(dH2O(0)).toBeCloseTo(0.99984, 5);
    });
  });

  describe('lbbl / P round-trip', () => {
    it('P(lbbl(Plato)) round-trips within tolerance', () => {
      for (const plato of [8, 12, 14, 16, 20]) {
        expect(P(lbbl(plato))).toBeCloseTo(plato, 3);
      }
    });

    it('lbbl(14) matches the KB Molasses worked example scale (~38.17 lbs/bbl at 14P)', () => {
      expect(lbbl(14)).toBeCloseTo(38.17, 1);
    });
  });

  describe('REx / ALx — KB correctness gate: OG=13.0, RDF=64.9 -> RE=4.771, ALC=4.269', () => {
    it('REx(13, 0.2, 64.9, 1.1, 1) ~= 4.771', () => {
      expect(REx(13, 0.2, 64.9, 1.1, 1)).toBeCloseTo(4.771, 2);
    });

    it('ALx(13, 0.2, 64.9, 1.1, 1) ~= 4.269', () => {
      expect(ALx(13, 0.2, 64.9, 1.1, 1)).toBeCloseTo(4.269, 2);
    });

    it('dRE (uncertainty) ~= 0.223', () => {
      expect(REx(13, 0.2, 64.9, 1.1, 2)).toBeCloseTo(0.223, 1);
    });

    it('dALC (uncertainty) ~= 0.144', () => {
      expect(ALx(13, 0.2, 64.9, 1.1, 2)).toBeCloseTo(0.144, 1);
    });
  });

  describe('SGBeer / SGBeerx', () => {
    it('SGBeer(RE=4.771, ALC=4.269) ~= 1.010862 (KB worked)', () => {
      expect(SGBeer(4.771, 4.269)).toBeCloseTo(1.010862, 3);
    });

    it('SGBeerx(13, 0.2, 64.9, 1.1, 1) ~= 1.010862', () => {
      expect(SGBeerx(13, 0.2, 64.9, 1.1, 1)).toBeCloseTo(1.010862, 3);
    });
  });

  describe('fAE', () => {
    it('fAE(SGBeer) ~= 2.782 for the KB worked beer (AE from SG)', () => {
      expect(fAE(1.010862)).toBeCloseTo(2.782, 1);
    });

    it('is the inverse of fSGE', () => {
      const plato = 12;
      const sg = fSGE(plato);
      expect(fAE(sg)).toBeCloseTo(plato, 3);
    });
  });

  describe('SGA60', () => {
    it('is close to the KB-reported SGA60(4.349) ~= 0.992265', () => {
      expect(SGA60(4.349)).toBeCloseTo(0.99223, 3);
    });
  });
});
