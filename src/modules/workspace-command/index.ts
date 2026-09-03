import { createId } from "@/domain/ids";
import type {
  Actor,
  Catalog,
  CommandResult,
  ImageJob,
  ImageOperation,
  Placement,
  Version,
} from "@/domain/types";
import {
  learnFromComparison,
  recommendInGroup,
} from "@/modules/preference-profile";
import { snapshotOf, type CatalogStore } from "@/modules/photo-catalog/store";

export interface PlacementDraft {
  placementId: string;
  assetId: string;
  versionId: string;
  src: string;
  width: number;
  height: number;
  ghost?: boolean;
}

export type LayoutKind =
  | "grid"
  | "row"
  | "column"
  | "comparison"
  | "postcard"
  | "contact-sheet"
  | "carousel";

export interface CanvasPort {
  placeImages(drafts: PlacementDraft[]): { shapeIds: string[] };
  arrange(shapeIds: string[], layout: LayoutKind): void;
  createNote(text: string): void;
  updateImageSrc(
    shapeId: string,
    src: string,
    size: { width: number; height: number },
  ): void;
  markUndo(label: string): void;
  lookAtShape(shapeId: string): void;
  selectShapes(shapeIds: string[]): void;
  exportFrame(): Promise<{ type: string; href: string } | null>;
}

export interface ImageJobPort {
  start(input: {
    operation: ImageOperation;
    sourceUrl: string;
    instruction: string;
    maskPng?: string;
    idempotencyKey: string;
  }): Promise<{
    outputSrc: string;
    width: number;
    height: number;
    provider: string;
    model?: string;
    labeledDemoFallback?: boolean;
  }>;
}

function ok(
  summary: string,
  stateChanges: string[],
  data?: Record<string, unknown>,
  extra?: Partial<CommandResult>,
): CommandResult {
  return { ok: true, summary, stateChanges, data, ...extra };
}

function fail(summary: string, extra?: Partial<CommandResult>): CommandResult {
  return { ok: false, summary, stateChanges: [], ...extra };
}

export function createWorkspaceCommands(
  store: CatalogStore,
  canvas?: CanvasPort,
  jobs?: ImageJobPort,
) {
  const idempotency = new Map<string, CommandResult>();

  function mutate(
    actor: Actor,
    operation: string,
    undoLabel: string,
    summary: string,
    affectedAssetIds: string[],
    recipe: (catalog: Catalog) => Catalog,
  ): Catalog {
    const current = store.get();
    const next = recipe(current);
    next.events = [
      ...next.events,
      {
        id: createId("evt"),
        actor,
        operation,
        summary,
        undoLabel,
        affectedAssetIds,
        createdAt: Date.now(),
      },
    ];
    store.set(next);
    return next;
  }

  return {
    getSnapshot: () => snapshotOf(store.get()),

    setSelection(selection: Catalog["selection"]) {
      const catalog = store.get();
      store.set({ ...catalog, selection });
      return ok("Selection updated.", ["selection"]);
    },

    recordPreference(input: {
      actor?: Actor;
      preferredAssetId: string;
      rejectedAssetIds?: string[];
      groupId?: string;
    }) {
      const catalog = store.get();
      const groupId = input.groupId ?? catalog.selection.openGroupId;
      const group = catalog.groups.find((item) => item.id === groupId);
      const preferred = catalog.assets.find(
        (item) => item.id === input.preferredAssetId,
      );
      if (!preferred) return fail("Preferred photo was not found.");

      const rejectedIds =
        input.rejectedAssetIds ??
        (group
          ? group.assetIds.filter((id) => id !== preferred.id)
          : catalog.selection.assetIds.filter((id) => id !== preferred.id));

      const preferredAnalysis = catalog.analyses.find(
        (item) => item.versionId === preferred.originalVersionId,
      );
      if (!preferredAnalysis) return fail("No analysis for the preferred photo.");

      const rejectedSignals = rejectedIds
        .map((id) => catalog.assets.find((item) => item.id === id))
        .filter(Boolean)
        .map((asset) =>
          catalog.analyses.find((item) => item.versionId === asset!.originalVersionId),
        )
        .filter(Boolean)
        .map((analysis) => analysis!.qualitySignals);

      if (rejectedSignals.length === 0) {
        return fail("Need at least one rejected alternative to learn a preference.");
      }

      const preference = learnFromComparison(
        catalog.preference,
        preferredAnalysis.qualitySignals,
        rejectedSignals,
      );

      mutate(
        input.actor ?? "human",
        "record_preference",
        "Record preference",
        `Kept ${preferred.demoId ?? preferred.id}; learned ${preference.summaryLines[0]}`,
        [preferred.id, ...rejectedIds],
        (current) => ({
          ...current,
          preference,
          choices: [
            ...current.choices,
            {
              id: createId("choice"),
              workspaceId: current.workspaceId,
              groupId,
              preferredAssetId: preferred.id,
              rejectedAssetIds: rejectedIds,
              tradeoffs: [],
              confidence: 0.7,
              createdAt: Date.now(),
            },
          ],
          groups: current.groups.map((item) =>
            item.id === groupId
              ? { ...item, status: "resolved", recommendation: preferred.id }
              : item,
          ),
        }),
      );

      return ok(preference.summaryLines[0], ["preference", "humanChoices", "photoGroups"], {
        preference,
      });
    },

    applyPreferences(input?: { minConfidence?: number; actor?: Actor }) {
      const catalog = store.get();
      const min = input?.minConfidence ?? 0.7;
      const resolved: string[] = [];
      const left: string[] = [];

      const groups = catalog.groups.map((group) => {
        if (group.status === "resolved") return group;
        const rec = recommendInGroup(catalog, group.id);
        if (!rec || rec.confidence < min) {
          left.push(group.id);
          return { ...group, status: "needs_taste" as const, confidence: rec?.confidence };
        }
        resolved.push(group.id);
        return {
          ...group,
          status: "resolved" as const,
          recommendation: rec.assetId,
          confidence: rec.confidence,
        };
      });

      mutate(
        input?.actor ?? "agent",
        "apply_preferences",
        "Apply preferences",
        `Resolved ${resolved.length} group(s); left ${left.length} for taste.`,
        [],
        (current) => ({ ...current, groups }),
      );

      return ok(
        `Resolved ${resolved.length} high-confidence group(s) and left ${left.length} for you.`,
        ["photoGroups"],
        { resolved, left },
      );
    },

    archivePhotos(assetIds: string[], actor: Actor = "human") {
      mutate(
        actor,
        "archive_photos",
        "Archive photos",
        `Archived ${assetIds.length} photo(s).`,
        assetIds,
        (current) => ({
          ...current,
          assets: current.assets.map((asset) =>
            assetIds.includes(asset.id)
              ? { ...asset, archivedAt: Date.now() }
              : asset,
          ),
        }),
      );
      return ok(`Archived ${assetIds.length} photo(s). Restore anytime.`, ["assets"]);
    },

    restorePhotos(assetIds: string[], actor: Actor = "human") {
      mutate(
        actor,
        "restore_photos",
        "Restore photos",
        `Restored ${assetIds.length} photo(s).`,
        assetIds,
        (current) => ({
          ...current,
          assets: current.assets.map((asset) =>
            assetIds.includes(asset.id) ? { ...asset, archivedAt: undefined } : asset,
          ),
        }),
      );
      return ok(`Restored ${assetIds.length} photo(s).`, ["assets"]);
    },

    placePhotos(input: {
      assetIds?: string[];
      actor?: Actor;
      layout?: LayoutKind;
    }) {
      if (!canvas) return fail("Canvas is not ready.");
      const catalog = store.get();
      const assetIds =
        input.assetIds && input.assetIds.length > 0
          ? input.assetIds
          : catalog.selection.assetIds;
      if (assetIds.length === 0) return fail("Select photos in the tray first.");

      const drafts: PlacementDraft[] = [];
      const placements: Placement[] = [];
      for (const assetId of assetIds) {
        const asset = catalog.assets.find((item) => item.id === assetId);
        if (!asset || asset.archivedAt) continue;
        const version = catalog.versions.find((item) => item.id === asset.originalVersionId);
        if (!version) continue;
        const placementId = createId("plc");
        drafts.push({
          placementId,
          assetId,
          versionId: version.id,
          src: version.localSrc,
          width: version.width,
          height: version.height,
        });
        placements.push({
          id: placementId,
          workspaceId: catalog.workspaceId,
          assetId,
          activeVersionId: version.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      canvas.markUndo("Place photos");
      const { shapeIds } = canvas.placeImages(drafts);
      const withShapes = placements.map((placement, index) => ({
        ...placement,
        tldrawShapeId: shapeIds[index],
      }));
      if (input.layout) canvas.arrange(shapeIds.filter(Boolean), input.layout);

      mutate(
        input.actor ?? "human",
        "place_photos",
        "Place photos",
        `Placed ${withShapes.length} photo(s) on the canvas.`,
        assetIds,
        (current) => ({
          ...current,
          placements: [...current.placements, ...withShapes],
        }),
      );

      return ok(`Placed ${withShapes.length} photo(s) on the canvas.`, ["placements"], {
        placementIds: withShapes.map((item) => item.id),
      });
    },

    arrangeSelection(input: { layout: LayoutKind; actor?: Actor }) {
      if (!canvas) return fail("Canvas is not ready.");
      const catalog = store.get();
      const shapeIds =
        catalog.selection.shapeIds.length > 0
          ? catalog.selection.shapeIds
          : catalog.placements
              .map((item) => item.tldrawShapeId)
              .filter((id): id is string => Boolean(id));
      if (shapeIds.length === 0) return fail("Nothing on the canvas to arrange.");
      canvas.markUndo(`Arrange ${input.layout}`);
      canvas.arrange(shapeIds, input.layout);
      mutate(
        input.actor ?? "agent",
        "arrange_selection",
        `Arrange ${input.layout}`,
        `Arranged ${shapeIds.length} item(s) as ${input.layout}.`,
        [],
        (current) => current,
      );
      return ok(`Arranged the selection as a ${input.layout}.`, ["canvas"]);
    },

    createCanvasContent(input: { note: string; actor?: Actor }) {
      if (!canvas) return fail("Canvas is not ready.");
      canvas.markUndo("Add note");
      canvas.createNote(input.note);
      mutate(
        input.actor ?? "agent",
        "create_canvas_content",
        "Add note",
        `Added a note: ${input.note}`,
        [],
        (current) => current,
      );
      return ok(`Added a sticky note.`, ["canvas"]);
    },

    lookAt(input: { assetId?: string; placementId?: string }) {
      if (!canvas) return fail("Canvas is not ready.");
      const catalog = store.get();
      const placement = catalog.placements.find((item) =>
        input.placementId
          ? item.id === input.placementId
          : item.assetId === input.assetId,
      );
      if (!placement?.tldrawShapeId) return fail("That photo is not on the canvas.");
      canvas.lookAtShape(placement.tldrawShapeId);
      canvas.selectShapes([placement.tldrawShapeId]);
      return ok("Moved the viewport to the requested photo.", ["viewport"]);
    },

    focusOn(input: { groupId?: string; assetId?: string }) {
      const catalog = store.get();
      store.set({
        ...catalog,
        selection: {
          ...catalog.selection,
          openGroupId: input.groupId,
          assetIds: input.assetId
            ? [input.assetId]
            : input.groupId
              ? catalog.groups.find((group) => group.id === input.groupId)?.assetIds ??
                catalog.selection.assetIds
              : catalog.selection.assetIds,
        },
      });
      return ok("Focused the tray on the requested group.", ["selection"]);
    },

    async startImageJob(input: {
      actor?: Actor;
      operation?: ImageOperation;
      instruction: string;
      versionId?: string;
      placementId?: string;
      maskPng?: string;
      idempotencyKey?: string;
    }) {
      const key = input.idempotencyKey ?? createId("idem");
      const cached = idempotency.get(key);
      if (cached) return cached;

      const catalog = store.get();
      const placement = catalog.placements.find((item) =>
        input.placementId
          ? item.id === input.placementId
          : catalog.selection.placementIds.includes(item.id),
      );
      const versionId =
        input.versionId ??
        placement?.activeVersionId ??
        catalog.versions.find((item) =>
          catalog.selection.assetIds.some(
            (assetId) =>
              catalog.assets.find((asset) => asset.id === assetId)?.originalVersionId ===
              item.id,
          ),
        )?.id;
      const version = catalog.versions.find((item) => item.id === versionId);
      if (!version) {
        return fail("Select a photo on the canvas before editing.");
      }

      const jobId = createId("job");
      const ghostPlacementId = createId("plc");
      const operation = input.operation ?? (input.maskPng ? "inpaint" : "instruct_edit");

      const ghostVersion: Version = {
        id: createId("ver"),
        assetId: version.assetId,
        parentVersionId: version.id,
        localSrc: version.localSrc,
        width: version.width,
        height: version.height,
        mimeType: version.mimeType,
        createdBy: input.actor ?? "agent",
        operation,
        instruction: input.instruction,
        createdAt: Date.now(),
      };

      const job: ImageJob = {
        id: jobId,
        workspaceId: catalog.workspaceId,
        operation,
        status: "running",
        inputVersionIds: [version.id],
        outputVersionIds: [],
        placementId: ghostPlacementId,
        instruction: input.instruction,
        idempotencyKey: key,
        progress: 0.1,
        requestedBy: input.actor ?? "agent",
        createdAt: Date.now(),
      };

      canvas?.markUndo("Edit photo");
      let ghostShapeId: string | undefined;
      if (canvas) {
        const placed = canvas.placeImages([
          {
            placementId: ghostPlacementId,
            assetId: version.assetId,
            versionId: ghostVersion.id,
            src: version.localSrc,
            width: version.width,
            height: version.height,
            ghost: true,
          },
        ]);
        ghostShapeId = placed.shapeIds[0];
      }

      mutate(
        input.actor ?? "agent",
        "edit_image",
        "Edit photo",
        `Started ${operation}: ${input.instruction}`,
        [version.assetId],
        (current) => ({
          ...current,
          versions: [...current.versions, ghostVersion],
          jobs: [...current.jobs, job],
          placements: [
            ...current.placements,
            {
              id: ghostPlacementId,
              workspaceId: current.workspaceId,
              assetId: version.assetId,
              activeVersionId: ghostVersion.id,
              tldrawShapeId: ghostShapeId,
              ghostJobId: jobId,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        }),
      );

      const result = ok(
        `Started image job ${jobId}. A ghost variant is on the canvas.`,
        ["jobs", "placements", "versions"],
        { jobId, placementId: ghostPlacementId, versionId: ghostVersion.id },
        { jobId },
      );
      idempotency.set(key, result);

      void runJob({
        store,
        canvas,
        jobs,
        jobId,
        ghostVersionId: ghostVersion.id,
        ghostPlacementId,
        sourceUrl: version.localSrc,
        instruction: input.instruction,
        maskPng: input.maskPng,
        operation,
      });

      return result;
    },

    acceptVariant(input: { placementId?: string; versionId?: string; actor?: Actor }) {
      const catalog = store.get();
      const version = catalog.versions.find((item) => item.id === input.versionId);
      const ghost = catalog.placements.find((item) => item.id === input.placementId);
      const parentPlacement = catalog.placements.find(
        (item) =>
          item.assetId === (version?.assetId ?? ghost?.assetId) &&
          !item.ghostJobId,
      );
      if (!parentPlacement || !version) {
        return fail("Could not find a placement to accept this variant onto.");
      }
      const shapeId = parentPlacement.tldrawShapeId;
      if (shapeId && canvas) {
        canvas.markUndo("Accept variant");
        canvas.updateImageSrc(shapeId, version.localSrc, {
          width: version.width,
          height: version.height,
        });
      }
      mutate(
        input.actor ?? "human",
        "accept_variant",
        "Accept variant",
        "Accepted the variant as the active version.",
        [parentPlacement.assetId],
        (current) => ({
          ...current,
          placements: current.placements.map((item) =>
            item.id === parentPlacement.id
              ? { ...item, activeVersionId: version.id, updatedAt: Date.now() }
              : item,
          ),
        }),
      );
      return ok("Accepted the variant. Alternatives remain in the version history.", [
        "placements",
      ]);
    },

    revertPlacement(placementId: string, actor: Actor = "human") {
      const catalog = store.get();
      const placement = catalog.placements.find((item) => item.id === placementId);
      if (!placement) return fail("Placement not found.");
      const asset = catalog.assets.find((item) => item.id === placement.assetId);
      if (!asset) return fail("Asset not found.");
      const original = catalog.versions.find((item) => item.id === asset.originalVersionId);
      if (!original) return fail("Original version missing.");
      if (placement.tldrawShapeId && canvas) {
        canvas.markUndo("Revert placement");
        canvas.updateImageSrc(placement.tldrawShapeId, original.localSrc, {
          width: original.width,
          height: original.height,
        });
      }
      mutate(
        actor,
        "revert_placement",
        "Revert placement",
        "Reverted the placement to the original version.",
        [placement.assetId],
        (current) => ({
          ...current,
          placements: current.placements.map((item) =>
            item.id === placementId
              ? { ...item, activeVersionId: original.id, updatedAt: Date.now() }
              : item,
          ),
        }),
      );
      return ok("Reverted to the original version.", ["placements"]);
    },

    grantConsent() {
      const catalog = store.get();
      store.set({
        ...catalog,
        consent: { externalProvider: true, acceptedAt: Date.now() },
      });
      return ok("External image-provider consent recorded.", ["consent"]);
    },
  };
}

async function runJob(input: {
  store: CatalogStore;
  canvas?: CanvasPort;
  jobs?: ImageJobPort;
  jobId: string;
  ghostVersionId: string;
  ghostPlacementId: string;
  sourceUrl: string;
  instruction: string;
  maskPng?: string;
  operation: ImageOperation;
}) {
  try {
    const adapter = input.jobs;
    if (!adapter) throw new Error("No image job adapter configured.");
    const output = await adapter.start({
      operation: input.operation,
      sourceUrl: input.sourceUrl,
      instruction: input.instruction,
      maskPng: input.maskPng,
      idempotencyKey: input.jobId,
    });
    const catalog = input.store.get();
    const ghostVersion = catalog.versions.find((item) => item.id === input.ghostVersionId);
    if (!ghostVersion) return;
    const completed: Version = {
      ...ghostVersion,
      localSrc: output.outputSrc,
      width: output.width,
      height: output.height,
      provider: output.provider,
      model: output.model,
      labeledDemoFallback: output.labeledDemoFallback,
    };
    const placement = catalog.placements.find((item) => item.id === input.ghostPlacementId);
    if (placement?.tldrawShapeId && input.canvas) {
      input.canvas.updateImageSrc(placement.tldrawShapeId, output.outputSrc, {
        width: output.width,
        height: output.height,
      });
    }
    input.store.set({
      ...catalog,
      versions: catalog.versions.map((item) =>
        item.id === completed.id ? completed : item,
      ),
      placements: catalog.placements.map((item) =>
        item.id === input.ghostPlacementId
          ? { ...item, ghostJobId: undefined, updatedAt: Date.now() }
          : item,
      ),
      jobs: catalog.jobs.map((job) =>
        job.id === input.jobId
          ? {
              ...job,
              status: "succeeded",
              progress: 1,
              outputVersionIds: [completed.id],
              labeledDemoFallback: output.labeledDemoFallback,
              completedAt: Date.now(),
            }
          : job,
      ),
    });
  } catch (error) {
    const catalog = input.store.get();
    const message = error instanceof Error ? error.message : "Image job failed.";
    input.store.set({
      ...catalog,
      jobs: catalog.jobs.map((job) =>
        job.id === input.jobId
          ? {
              ...job,
              status: "failed",
              errorCode: "failed",
              errorMessage: message,
              completedAt: Date.now(),
            }
          : job,
      ),
    });
  }
}

export type WorkspaceCommands = ReturnType<typeof createWorkspaceCommands>;
