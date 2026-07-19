/**
 * useCatalog.ts
 * React hook exposing the support-table lists plus memoized resolver maps
 * (id -> row) so components can look up units/materials/plants/etc. cheaply.
 * Backed by the data repository (seed + localStorage overlay).
 */

'use client';

import { useMemo } from 'react';
import { repository as defaultRepository, Repository } from '@/lib/data/repository';
import type { Category, Material, Plant, Process, Product, Unit } from '@/lib/data/types';

export interface Catalog {
  materials: Material[];
  plants: Plant[];
  products: Product[];
  processes: Process[];
  units: Unit[];
  categories: Category[];
  materialById: Map<number, Material>;
  plantById: Map<number, Plant>;
  productById: Map<number, Product>;
  processById: Map<number, Process>;
  unitById: Map<number, Unit>;
  categoryById: Map<number, Category>;
}

function indexBy<T>(rows: T[], idOf: (r: T) => number): Map<number, T> {
  const map = new Map<number, T>();
  for (const r of rows) map.set(idOf(r), r);
  return map;
}

/**
 * @param repo repository instance (defaults to the shared singleton)
 * @param version bump this to force a re-read after a mutation
 */
export function useCatalog(repo: Repository = defaultRepository, version = 0): Catalog {
  return useMemo(() => {
    const materials = repo.listMaterials();
    const plants = repo.listPlants();
    const products = repo.listProducts();
    const processes = repo.listProcesses();
    const units = repo.listUnits();
    const categories = repo.listCategories();
    return {
      materials,
      plants,
      products,
      processes,
      units,
      categories,
      materialById: indexBy(materials, (m) => m.MaterialID),
      plantById: indexBy(plants, (p) => p.PlantID),
      productById: indexBy(products, (p) => p.ProductID),
      processById: indexBy(processes, (p) => p.ProcessID),
      unitById: indexBy(units, (u) => u.UnitID),
      categoryById: indexBy(categories, (c) => c.CategoryID),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, version]);
}
