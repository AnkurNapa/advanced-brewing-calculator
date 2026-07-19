/**
 * fakeStorage.ts — a Map-backed StorageAdapter for deterministic tests.
 */
import type { StorageAdapter } from '@/lib/data/overlay';

export function fakeStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}
