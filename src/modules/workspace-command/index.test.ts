import { describe, expect, it } from "vitest";
import { buildDemoCatalog } from "@/modules/photo-catalog/demo";
import { createMemoryCatalogStore, snapshotOf } from "@/modules/photo-catalog/store";
import { createWorkspaceCommands } from "@/modules/workspace-command";
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

  it("does not permanently delete archived photos", () => {
    const store = createMemoryCatalogStore(buildDemoCatalog());
    const commands = createWorkspaceCommands(store);
    commands.archivePhotos(["asset_porch-a"]);
    expect(store.get().assets.find((asset) => asset.id === "asset_porch-a")?.archivedAt).toBeTruthy();
    commands.restorePhotos(["asset_porch-a"]);
    expect(store.get().assets.find((asset) => asset.id === "asset_porch-a")?.archivedAt).toBeUndefined();
  });
});

describe("webmcp tool availability", () => {
  it("always exposes read tools and withholds generate until consent", () => {
    const snapshot = snapshotOf(buildDemoCatalog());
    const names = toolsForState(snapshot).map((tool) => tool.name);
    expect(names).toContain("get_workspace_state");
    expect(names).toContain("get_spatial_intent");
    expect(names).not.toContain("generate_image");
  });
});
