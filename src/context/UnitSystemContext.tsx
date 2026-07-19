'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UnitSystem } from '@/lib/data/types';

const STORAGE_KEY = 'abc:unitSystem';
const DEFAULT_SYSTEM: UnitSystem = 'metric';

interface UnitSystemContextValue {
  unitSystem: UnitSystem;
  setUnitSystem: (next: UnitSystem) => void;
  toggleUnitSystem: () => void;
}

const UnitSystemContext = createContext<UnitSystemContextValue | null>(null);

function isUnitSystem(value: unknown): value is UnitSystem {
  return value === 'metric' || value === 'us';
}

/** Reads the persisted unit system. SSR-safe: returns default off the client. */
function readStoredSystem(): UnitSystem {
  if (typeof window === 'undefined') return DEFAULT_SYSTEM;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isUnitSystem(stored) ? stored : DEFAULT_SYSTEM;
  } catch {
    return DEFAULT_SYSTEM;
  }
}

export function UnitSystemProvider({ children }: { children: ReactNode }) {
  // Start from the default so server + first client render match (no hydration
  // mismatch); reconcile with localStorage after mount.
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(DEFAULT_SYSTEM);

  useEffect(() => {
    const stored = readStoredSystem();
    if (stored !== unitSystem) setUnitSystemState(stored);
    // Only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setUnitSystem = useCallback((next: UnitSystem) => {
    setUnitSystemState(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable (private mode) — in-memory state still works */
    }
  }, []);

  const toggleUnitSystem = useCallback(() => {
    setUnitSystem(unitSystem === 'metric' ? 'us' : 'metric');
  }, [setUnitSystem, unitSystem]);

  const value = useMemo<UnitSystemContextValue>(
    () => ({ unitSystem, setUnitSystem, toggleUnitSystem }),
    [unitSystem, setUnitSystem, toggleUnitSystem],
  );

  return (
    <UnitSystemContext.Provider value={value}>
      {children}
    </UnitSystemContext.Provider>
  );
}

/** Access the current unit system. Must be used inside <UnitSystemProvider>. */
export function useUnitSystem(): UnitSystemContextValue {
  const ctx = useContext(UnitSystemContext);
  if (!ctx) {
    throw new Error('useUnitSystem must be used within a UnitSystemProvider');
  }
  return ctx;
}
