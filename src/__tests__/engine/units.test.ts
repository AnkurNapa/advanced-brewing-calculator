import { describe, it, expect } from 'vitest';
import { toBase, fromBase, celsiusToFahrenheit, fahrenheitToCelsius } from '@/lib/engine/units';

describe('units engine', () => {
  it('converts Kilograms to base Pounds: base = value*2.2046 + 0', () => {
    // Kilograms unit: BaseUnitPerUnit=2.2046, BaseunitInt=0 (units.json UnitID=43)
    const kg = { BaseUnitPerUnit: 2.2046, BaseunitInt: 0 };
    expect(toBase(10, kg)).toBeCloseTo(22.046, 5);
  });

  it('round-trips fromBase(toBase(x)) back to x for Kilograms', () => {
    const kg = { BaseUnitPerUnit: 2.2046, BaseunitInt: 0 };
    const original = 37.5;
    const roundTripped = fromBase(toBase(original, kg), kg);
    expect(roundTripped).toBeCloseTo(original, 8);
  });

  it('converts Celsius to Fahrenheit using the intercept form', () => {
    // Fahrenheit = Centigrade*1.8 + 32
    expect(celsiusToFahrenheit(0)).toBeCloseTo(32, 8);
    expect(celsiusToFahrenheit(100)).toBeCloseTo(212, 8);
    expect(celsiusToFahrenheit(77.78)).toBeCloseTo(172.004, 2);
  });

  it('round-trips Fahrenheit back to Celsius', () => {
    const c = 22.5;
    expect(fahrenheitToCelsius(celsiusToFahrenheit(c))).toBeCloseTo(c, 8);
  });

  it('defaults to identity (perUnit=1, int=0) when fields are null', () => {
    const identity = { BaseUnitPerUnit: null, BaseunitInt: null };
    expect(toBase(42, identity)).toBe(42);
    expect(fromBase(42, identity)).toBe(42);
  });

  it('throws when BaseUnitPerUnit is zero on fromBase', () => {
    const zero = { BaseUnitPerUnit: 0, BaseunitInt: 0 };
    expect(() => fromBase(10, zero)).toThrow();
  });
});
