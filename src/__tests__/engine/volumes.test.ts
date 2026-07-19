import { describe, it, expect } from 'vitest';
import {
  yeastVolume,
  trubVolume,
  hopbackLoss,
  whirlpoolVolume,
  coldWortVolume,
  knockoutVolume,
  evaporationPercent,
  kettleFullVolume,
} from '@/lib/engine/volumes';

describe('volumes engine', () => {
  it('matches the KB whirlpool worked example (~53.0 bbl at 64F pitch / 212F boil, VTrub=0.9)', () => {
    const vWhirl = whirlpoolVolume(50, 64, 212, 0.9, 0);
    expect(vWhirl).toBeCloseTo(53.0, 1);
  });

  it('trub defaults to 1% of whirlpool volume when blank', () => {
    expect(trubVolume(100, undefined)).toBeCloseTo(1, 5);
    expect(trubVolume(100, null)).toBeCloseTo(1, 5);
    expect(trubVolume(100, 2)).toBeCloseTo(2, 5);
  });

  it('matches the KB cold-wort worked example (~50.0 bbl)', () => {
    const vCool = coldWortVolume(53.0, 0.9, 0, 64);
    expect(vCool).toBeCloseTo(50.0, 1);
  });

  it('knockoutVolume subtracts whirlpool syrup volume', () => {
    expect(knockoutVolume(53.0, 0)).toBeCloseTo(53.0, 5);
    expect(knockoutVolume(53.0, 3)).toBeCloseTo(50.0, 5);
  });

  it('yeastVolume scales linearly with fermenter volume', () => {
    expect(yeastVolume(1, 10, 100)).toBeCloseTo(10, 5);
  });

  it('kettleFullVolume expands for evaporation', () => {
    const vkFull = kettleFullVolume(56, 0, 2);
    // KB: (56-0)*(1+2/(100-2)) => 56*1.0204... ~=57.14
    expect(vkFull).toBeCloseTo(57.14, 1);
  });

  it('evaporationPercent is positive when knockout Plato (post-boil, concentrated) exceeds kettle-full Plato (pre-boil, dilute)', () => {
    const evap = evaporationPercent(12.24, 12); // KO more concentrated than kettle-full
    expect(evap).toBeGreaterThan(0);
  });
});
