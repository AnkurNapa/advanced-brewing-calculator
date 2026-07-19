/**
 * Unit conversion engine.
 * Source: MasterBrewers_KB/04_Calculations_Reference.md §1 "Unit conversion"
 *
 *   Base Unit = Unit * (BaseUnitPerUnit) + (BaseUnitIntercept)
 *   Unit      = (Base Unit - BaseUnitIntercept) / (BaseUnitPerUnit)
 *
 * All internal engine math operates in base units (pound, barrel, inch, °F).
 * This module converts a display-unit value to/from its base unit using the
 * `BaseUnitPerUnit` / `BaseunitInt` factors carried on the `Unit` record.
 */

import type { Unit } from '@/lib/data/types';

/** Minimal shape needed for conversion; accepts a full Unit or a partial lookup result. */
export interface UnitFactor {
  BaseUnitPerUnit: number | null;
  BaseunitInt: number | null;
}

/**
 * Convert a value expressed in `unit` to its base unit.
 * base = value * BaseUnitPerUnit + BaseunitInt
 */
export function toBase(value: number, unit: UnitFactor | Unit): number {
  const perUnit = unit.BaseUnitPerUnit ?? 1;
  const intercept = unit.BaseunitInt ?? 0;
  return value * perUnit + intercept;
}

/**
 * Convert a base-unit value back to `unit`.
 * unit = (base - BaseunitInt) / BaseUnitPerUnit
 */
export function fromBase(base: number, unit: UnitFactor | Unit): number {
  const perUnit = unit.BaseUnitPerUnit ?? 1;
  const intercept = unit.BaseunitInt ?? 0;
  if (perUnit === 0) {
    throw new Error('fromBase: BaseUnitPerUnit is zero, cannot divide');
  }
  return (base - intercept) / perUnit;
}

/** Convenience: build a UnitFactor from a units.json lookup by UnitID. */
export function findUnit(units: Unit[], unitId: number): Unit | undefined {
  return units.find((u) => u.UnitID === unitId);
}

/** Fahrenheit <-> Celsius (BaseUnit = Fahrenheit). Used across gravity/volumes. */
export const CtoF: UnitFactor = { BaseUnitPerUnit: 1.8, BaseunitInt: 32 };

export function celsiusToFahrenheit(celsius: number): number {
  return toBase(celsius, CtoF);
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return fromBase(fahrenheit, CtoF);
}
