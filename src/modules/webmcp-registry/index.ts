import type { Catalog, CommandResult, WorkspaceSnapshot } from "@/domain/types";
import type { SpatialIntent } from "@/modules/spatial-intent";
import type { LayoutKind, WorkspaceCommands } from "@/modules/workspace-command";

export type ToolAvailability =
  | "always"
  | "when_group_open"
  | "when_image_selected"
  | "when_shapes_selected"
  | "when_exportable"
  | "when_consent";

export interface ToolDescriptor {
  name: string;
  description: string;
  availability: ToolAvailability;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
  inputSchema: Record<string, unknown>;
}

export const TOOL_CATALOG: ToolDescriptor[] = [
  {
    name: "get_workspace_state",
    description:
      "Read the current Keepers workspace: photo groups, selection, preference profile, canvas placements, and open jobs. Use this before acting.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_selection",
    description: "Read the human's current selection: photos, groups, canvas shapes, and placements.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "look_at",
    description: "Pan and zoom the canvas to a placed photo so the human can see what you are about to change.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        assetId: { type: "string" },
        placementId: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "find_photos",
    description: "Find photos by scene, group type, or review status.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text match against titles, scenes, and reasons." },
        status: { type: "string", enum: ["unreviewed", "resolved", "needs_taste"] },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_photo_group",
    description: "Read one photo group, its members, recommendation, and why it needs a human choice.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: { groupId: { type: "string" } },
      required: ["groupId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_versions",
    description: "Read the version history for an asset. Originals are never overwritten.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: { assetId: { type: "string" } },
      required: ["assetId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_job",
    description: "Read progress, errors, and outputs for an image job.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: { jobId: { type: "string" } },
      required: ["jobId"],
      additionalProperties: false,
    },
  },
  {
    name: "focus_on",
    description: "Open a photo group in the tray so the human can choose, or focus a specific photo.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        groupId: { type: "string" },
        assetId: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "group_photos",
    description: "Explain the current grouping of the library. Groups are already computed for the demo collection.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_review_queue",
    description: "Focus the tray on groups that still need a human taste decision.",
    availability: "always",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "record_preference",
    description:
      "Record that the human preferred one photo over the others in the open group. This updates the interpretable preference profile.",
    availability: "when_group_open",
    inputSchema: {
      type: "object",
      properties: {
        preferredAssetId: { type: "string" },
        groupId: { type: "string" },
      },
      required: ["preferredAssetId"],
      additionalProperties: false,
    },
  },
  {
    name: "apply_preferences",
    description:
      "Apply the learned preference profile to unresolved groups. High-confidence groups are resolved; uncertain groups stay for the human. Never deletes photos.",
    availability: "when_group_open",
    inputSchema: {
      type: "object",
      properties: {
        minConfidence: { type: "number", description: "Default 0.7. Groups below this stay in the review tray." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "archive_photos",
    description: "Archive photos. Reversible. Never permanently deletes.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        assetIds: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
  },
  {
    name: "restore_photos",
    description: "Restore archived photos.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        assetIds: { type: "array", items: { type: "string" } },
      },
      required: ["assetIds"],
      additionalProperties: false,
    },
  },
  {
    name: "get_spatial_intent",
    description:
      "Resolve the human's current drawings, selection, and notes into semantic intent: which photo, which region, and any frame instructions. Use this before edit_image. Does not return raw canvas JSON or pixels.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "place_photos",
    description: "Place selected or specified photos onto the canvas. Defaults to the current tray selection.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        assetIds: { type: "array", items: { type: "string" } },
        layout: {
          type: "string",
          enum: ["grid", "row", "column", "comparison", "postcard", "contact-sheet", "carousel"],
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "arrange_selection",
    description:
      "Arrange currently selected canvas shapes using a named layout. Do not send coordinates; use a layout name.",
    availability: "when_shapes_selected",
    inputSchema: {
      type: "object",
      properties: {
        layout: {
          type: "string",
          enum: ["grid", "row", "column", "comparison", "postcard", "contact-sheet", "carousel"],
        },
      },
      required: ["layout"],
      additionalProperties: false,
    },
  },
  {
    name: "create_canvas_content",
    description: "Add a sticky note to the canvas, typically a frame-level instruction such as 'warm, consistent, postcard layout'.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: { note: { type: "string" } },
      required: ["note"],
      additionalProperties: false,
    },
  },
  {
    name: "edit_image",
    description:
      "Start an asynchronous pixel edit on the spatially intended photo. Returns immediately with a jobId and a ghost placement. Pass instruction such as 'remove the cooler'. If spatial intent is ambiguous, this tool will refuse rather than edit the wrong photo.",
    availability: "when_image_selected",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        instruction: { type: "string" },
        idempotencyKey: { type: "string" },
      },
      required: ["instruction"],
      additionalProperties: false,
    },
  },
  {
    name: "enhance_images",
    description: "Enhance the selected photos (denoise / color consistency). Starts jobs and ghost placements.",
    availability: "when_image_selected",
    inputSchema: {
      type: "object",
      properties: { instruction: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "generate_image",
    description: "Generate a new image onto the canvas from an instruction. Requires provider consent.",
    availability: "when_consent",
    inputSchema: {
      type: "object",
      properties: { instruction: { type: "string" } },
      required: ["instruction"],
      additionalProperties: false,
    },
  },
  {
    name: "accept_variant",
    description: "Make a completed variant the active version for its parent placement. Alternatives are kept.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        versionId: { type: "string" },
        placementId: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "revert_placement",
    description: "Point a placement back at the original version.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: { placementId: { type: "string" } },
      required: ["placementId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_export_options",
    description: "List export targets and formats for the current selection.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "prepare_export",
    description: "Export the current canvas view as PNG.",
    availability: "when_exportable",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", enum: ["canvas", "frame", "selection"] },
        format: { type: "string", enum: ["png", "jpeg", "webp"] },
      },
      additionalProperties: false,
    },
  },
];

export function toolsForState(snapshot: WorkspaceSnapshot): ToolDescriptor[] {
  return TOOL_CATALOG.filter((tool) => {
    switch (tool.availability) {
      case "always":
        return true;
      case "when_group_open":
        return Boolean(snapshot.selection.openGroupId) || snapshot.groups.length > 0;
      case "when_image_selected":
        return (
          snapshot.selection.placementIds.length > 0 ||
          snapshot.selection.assetIds.length > 0 ||
          snapshot.placements.length > 0
        );
      case "when_shapes_selected":
        return snapshot.selection.shapeIds.length > 1 || snapshot.placements.length > 1;
      case "when_exportable":
        return snapshot.placements.length > 0;
      case "when_consent":
        return snapshot.consent.externalProvider;
      default:
        return false;
    }
  });
}

export function formatToolResult(result: CommandResult): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  const payload = {
    summary: result.summary,
    ok: result.ok,
    clarification: result.clarification,
    jobId: result.jobId,
    stateChanges: result.stateChanges,
    data: result.data,
  };
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    isError: result.ok ? undefined : true,
  };
}

export function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: {
    commands: WorkspaceCommands;
    catalog: Catalog;
    spatialIntent: SpatialIntent;
    maskPng?: string;
  },
): CommandResult | Promise<CommandResult> {
  const actor = "agent" as const;
  switch (name) {
    case "get_workspace_state":
      return okData("Workspace snapshot.", ctx.commands.getSnapshot() as unknown as Record<string, unknown>);
    case "get_selection":
      return okData("Current selection.", ctx.catalog.selection as unknown as Record<string, unknown>);
    case "look_at":
      return ctx.commands.lookAt({
        assetId: str(args.assetId),
        placementId: str(args.placementId),
      });
    case "find_photos": {
      const query = (str(args.query) ?? "").toLowerCase();
      const status = str(args.status);
      const groups = ctx.catalog.groups.filter((group) => {
        if (status && group.status !== status) return false;
        if (!query) return true;
        return (
          group.reason.toLowerCase().includes(query) ||
          group.type.includes(query) ||
          group.assetIds.some((id) => id.includes(query))
        );
      });
      return okData(`Found ${groups.length} matching group(s).`, { groups });
    }
    case "get_photo_group": {
      const group = ctx.catalog.groups.find((item) => item.id === args.groupId);
      if (!group) return { ok: false, summary: "Group not found.", stateChanges: [] };
      return okData(group.reason, { group });
    }
    case "get_versions": {
      const versions = ctx.catalog.versions.filter((item) => item.assetId === args.assetId);
      return okData(`Found ${versions.length} version(s).`, {
        versions: versions.map((item) => ({
          id: item.id,
          parentVersionId: item.parentVersionId,
          operation: item.operation,
          instruction: item.instruction,
          provider: item.provider,
          model: item.model,
          labeledDemoFallback: item.labeledDemoFallback,
          createdBy: item.createdBy,
        })),
      });
    }
    case "get_job": {
      const job = ctx.catalog.jobs.find((item) => item.id === args.jobId);
      if (!job) return { ok: false, summary: "Job not found.", stateChanges: [] };
      return okData(`Job ${job.status}.`, { job });
    }
    case "focus_on":
      return ctx.commands.focusOn({ groupId: str(args.groupId), assetId: str(args.assetId) });
    case "group_photos":
      return okData("Library groups.", {
        groups: ctx.catalog.groups,
      });
    case "create_review_queue": {
      const needs = ctx.catalog.groups.filter((group) => group.status !== "resolved");
      if (needs[0]) ctx.commands.focusOn({ groupId: needs[0].id });
      return okData(`${needs.length} group(s) still need a taste decision.`, {
        groupIds: needs.map((item) => item.id),
      });
    }
    case "record_preference":
      return ctx.commands.recordPreference({
        actor,
        preferredAssetId: String(args.preferredAssetId),
        groupId: str(args.groupId),
      });
    case "apply_preferences":
      return ctx.commands.applyPreferences({
        actor,
        minConfidence: typeof args.minConfidence === "number" ? args.minConfidence : 0.7,
      });
    case "archive_photos":
      return ctx.commands.archivePhotos(
        Array.isArray(args.assetIds) ? args.assetIds.map(String) : ctx.catalog.selection.assetIds,
        actor,
      );
    case "restore_photos":
      return ctx.commands.restorePhotos(Array.isArray(args.assetIds) ? args.assetIds.map(String) : [], actor);
    case "get_spatial_intent":
      return okData("Resolved spatial intent.", { intent: summarizeIntent(ctx.spatialIntent) });
    case "place_photos":
      return ctx.commands.placePhotos({
        actor,
        assetIds: Array.isArray(args.assetIds) ? args.assetIds.map(String) : undefined,
        layout: args.layout as LayoutKind | undefined,
      });
    case "arrange_selection":
      return ctx.commands.arrangeSelection({
        actor,
        layout: args.layout as LayoutKind,
      });
    case "create_canvas_content":
      return ctx.commands.createCanvasContent({ actor, note: String(args.note) });
    case "edit_image": {
      if (ctx.spatialIntent.kind === "ambiguous") {
        return {
          ok: false,
          summary: ctx.spatialIntent.reason,
          clarification: ctx.spatialIntent.reason,
          stateChanges: [],
          data: { candidates: ctx.spatialIntent.candidates },
        };
      }
      if (ctx.spatialIntent.kind === "none") {
        return { ok: false, summary: ctx.spatialIntent.reason, stateChanges: [] };
      }
      return ctx.commands.startImageJob({
        actor,
        instruction: String(args.instruction),
        versionId: ctx.spatialIntent.target.versionId,
        placementId: ctx.spatialIntent.target.placementId,
        maskPng: ctx.maskPng,
        idempotencyKey: str(args.idempotencyKey),
      });
    }
    case "enhance_images":
      return ctx.commands.startImageJob({
        actor,
        operation: "enhance",
        instruction: str(args.instruction) ?? "Enhance: cleaner, consistent, natural.",
      });
    case "accept_variant":
      return ctx.commands.acceptVariant({
        actor,
        versionId: str(args.versionId),
        placementId: str(args.placementId),
      });
    case "revert_placement":
      return ctx.commands.revertPlacement(String(args.placementId), actor);
    case "get_export_options":
      return okData("Export options.", {
        targets: ["active photo version", "selected photos", "canvas frame", "complete canvas"],
        formats: ["png", "jpeg", "webp", "svg"],
      });
    case "generate_image":
      if (!ctx.catalog.consent.externalProvider) {
        return {
          ok: false,
          summary: "Generating a new image needs provider consent in the dock first.",
          stateChanges: [],
        };
      }
      return ctx.commands.startImageJob({
        actor,
        operation: "generate",
        instruction: String(args.instruction),
      });
    case "prepare_export":
      return okData("Use the Export control in the top bar to download the current canvas PNG.", {
        hint: "Canvas export is human-visible in the top bar so the file picker stays in the person's control.",
      });
    default:
      return { ok: false, summary: `Unknown tool: ${name}`, stateChanges: [] };
  }
}

function okData(summary: string, data: Record<string, unknown>): CommandResult {
  return { ok: true, summary, stateChanges: [], data };
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function summarizeIntent(intent: SpatialIntent) {
  if (intent.kind !== "clear") return intent;
  return {
    kind: intent.kind,
    target: intent.target,
    region: intent.region,
    notes: intent.notes,
    annotationKinds: intent.annotationKinds,
    mask: intent.mask
      ? { width: intent.mask.width, height: intent.mask.height, bytes: intent.mask.bytes.length }
      : undefined,
  };
}
