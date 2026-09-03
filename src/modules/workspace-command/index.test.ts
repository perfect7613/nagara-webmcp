import { describe, expect, it } from "vitest";
import { buildDemoCatalog, emptyCatalog } from "@/modules/photo-catalog/demo";
import { createMemoryCatalogStore, snapshotOf } from "@/modules/photo-catalog/store";
import { createWorkspaceCommands, type CanvasPort, type PlacementDraft } from "@/modules/workspace-command";
import { toolsForState } from "@/modules/webmcp-registry";

describe("workspace commands", () => {
  it("records a choice and updates the preference profile", () => {
    const store = createMemoryCatalogStore(buildDemoCatalog());
    const commands = createWorkspaceCommands(store);
    const result = commands.recordPreference({
      preferredAssetId: "asset_dock-jump-expressive",
      groupId: "grp_dock-jump",
    });
    expect(result.ok).toBe(true);
    expect(store.get().preference.weights.expression).toBeGreaterThan(0);
    expect(store.get().groups.find((group) => group.id === "grp_dock-jump")?.status).toBe(
      "resolved",
    );
  });

  it("ingests local photos into the tray without a group", () => {
    const store = createMemoryCatalogStore(emptyCatalog());
    const commands = createWorkspaceCommands(store);
    const result = commands.ingestPhotos({
      files: [
        {
          src: "/demo/porch-a.svg",
          name: "porch.jpg",
          width: 1200,
          height: 800,
          mimeType: "image/jpeg",
        },
      ],
    });
    expect(result.ok).toBe(true);
    expect(store.get().assets).toHaveLength(1);
    expect(store.get().groups).toHaveLength(0);
    expect(store.get().selection.assetIds).toHaveLength(1);
    const added = store.get().versions.find((version) => version.parameters?.filename === "porch.jpg");
    expect(added).toBeTruthy();
  });

  it("does not permanently delete archived photos", () => {
    const store = createMemoryCatalogStore(buildDemoCatalog());
    const commands = createWorkspaceCommands(store);
    commands.archivePhotos(["asset_porch-a"]);
    expect(store.get().assets.find((asset) => asset.id === "asset_porch-a")?.archivedAt).toBeTruthy();
    commands.restorePhotos(["asset_porch-a"]);
    expect(store.get().assets.find((asset) => asset.id === "asset_porch-a")?.archivedAt).toBeUndefined();
  });

  it("starts an instruct-edit from a selected tray photo without a placement id", async () => {
    const store = createMemoryCatalogStore(emptyCatalog());
    const commands = createWorkspaceCommands(store, undefined, {
      async start() {
        return {
          outputSrc: "data:image/png;base64,aaa",
          width: 100,
          height: 80,
          provider: "test",
        };
      },
    });
    commands.ingestPhotos({
      files: [
        {
          src: "/demo/porch-a.svg",
          name: "porch.jpg",
          width: 1200,
          height: 800,
          mimeType: "image/jpeg",
        },
      ],
    });
    const result = await commands.startImageJob({
      actor: "human",
      instruction: "add a hat",
    });
    expect(result.ok).toBe(true);
    expect(result.jobId).toBeTruthy();
    expect(store.get().jobs[0]?.instruction).toBe("add a hat");
    expect(store.get().jobs[0]?.operation).toBe("instruct_edit");
  });

  it("places a ghost edit beside the source photo", async () => {
    const drafts: Array<{ besideShapeId?: string; ghost?: boolean; width?: number; height?: number }> = [];
    const canvas = stubCanvas(drafts);
    const store = createMemoryCatalogStore(emptyCatalog());
    const commands = createWorkspaceCommands(store, canvas, {
      async start() {
        return {
          outputSrc: "data:image/png;base64,aaa",
          width: 100,
          height: 80,
          provider: "test",
        };
      },
    });
    commands.ingestPhotos({
      files: [
        {
          src: "/demo/porch-a.svg",
          name: "porch.jpg",
          width: 1200,
          height: 800,
          mimeType: "image/jpeg",
        },
      ],
    });
    commands.placePhotos({ actor: "human" });
    const result = await commands.startImageJob({
      actor: "human",
      instruction: "add a hat",
    });
    expect(result.ok).toBe(true);
    const ghost = drafts.find((draft) => draft.ghost);
    expect(ghost?.besideShapeId).toBe("shape_0");
    expect(ghost?.width).toBe(1200);
    expect(ghost?.height).toBe(800);
  });

  it("refuses an edit with an empty instruction", async () => {
    const store = createMemoryCatalogStore(emptyCatalog());
    const commands = createWorkspaceCommands(store);
    commands.ingestPhotos({
      files: [
        {
          src: "/demo/porch-a.svg",
          name: "porch.jpg",
          width: 1200,
          height: 800,
          mimeType: "image/jpeg",
        },
      ],
    });
    const result = await commands.startImageJob({
      actor: "human",
      instruction: "   ",
    });
    expect(result.ok).toBe(false);
  });
});

describe("webmcp tool availability", () => {
  it("always exposes read tools and withholds generate until consent", () => {
    const snapshot = snapshotOf(buildDemoCatalog());
    const names = toolsForState(snapshot).map((tool) => tool.name);
    expect(names).toContain("get_workspace_state");
    expect(names).toContain("get_spatial_intent");
    expect(names).toContain("get_canvas_state");
    expect(names).not.toContain("generate_image");
  });

  it("exposes canvas actions from Infinite Kanvas when a photo is selected", () => {
    const snapshot = snapshotOf(buildDemoCatalog());
    snapshot.selection.assetIds = [snapshot.groups[0]?.assetIds[0] ?? ""];
    const names = toolsForState(snapshot).map((tool) => tool.name);
    expect(names).toContain("remove_background");
    expect(names).toContain("isolate_object");
    expect(names).toContain("undo_canvas");
    expect(names).toContain("redo_canvas");
  });
});

function stubCanvas(
  drafts: Array<{ besideShapeId?: string; ghost?: boolean; width?: number; height?: number }>,
): CanvasPort {
  let placed = 0;
  const noop = () => undefined;
  return {
    placeImages(next: PlacementDraft[]) {
      drafts.push(...next);
      const shapeIds = next.map(() => `shape_${placed++}`);
      return { shapeIds };
    },
    arrange: noop,
    createNote: noop,
    updateImageSrc: noop,
    markUndo: noop,
    lookAtShape: noop,
    lookAtShapes: noop,
    selectShapes: noop,
    stampImageMeta: noop,
    exportFrame: async () => null,
    exportSelection: async () => null,
    undo: noop,
    redo: noop,
    canUndo: () => false,
    canRedo: () => false,
    zoomIn: noop,
    zoomOut: noop,
    zoomToFit: noop,
    resetZoom: noop,
    getZoomLevel: () => 1,
    duplicateSelected: () => [],
    deleteSelected: noop,
    bringToFront: noop,
    sendToBack: noop,
    bringForward: noop,
    sendBackward: noop,
  };
}
