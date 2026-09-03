import type { Catalog } from "@/domain/types";

export interface CatalogStore {
  get(): Catalog;
  set(next: Catalog): void;
  subscribe(listener: () => void): () => void;
}

export function createMemoryCatalogStore(initial: Catalog): CatalogStore {
  let catalog = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => catalog,
    set: (next) => {
      catalog = { ...next, updatedAt: Date.now() };
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function snapshotOf(catalog: Catalog) {
  return {
    name: catalog.name,
    workspaceId: catalog.workspaceId,
    photoCount: catalog.assets.filter((item) => !item.archivedAt).length,
    archivedCount: catalog.assets.filter((item) => item.archivedAt).length,
    groups: catalog.groups.map((group) => ({
      id: group.id,
      type: group.type,
      status: group.status,
      assetIds: group.assetIds,
      recommendation: group.recommendation,
      confidence: group.confidence,
      reason: group.reason,
    })),
    selection: catalog.selection,
    preference: catalog.preference,
    openJobs: catalog.jobs
      .filter((job) => job.status === "queued" || job.status === "running")
      .map((job) => ({
        id: job.id,
        operation: job.operation,
        status: job.status,
        progress: job.progress,
      })),
    placements: catalog.placements.map((placement) => ({
      id: placement.id,
      assetId: placement.assetId,
      activeVersionId: placement.activeVersionId,
      ghost: Boolean(placement.ghostJobId),
    })),
    recentEvents: catalog.events.slice(-12).reverse(),
    consent: catalog.consent,
  };
}
