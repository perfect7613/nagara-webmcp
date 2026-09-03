import type { CommandResult } from "@/domain/types";
import { isCategory } from "@/modules/classify-issue";
import { listRelatedTenders } from "@/modules/tenders";
import type { VoiceCommands } from "@/modules/voice-command";

export type ToolAvailability = "always" | "when_draft" | "when_selected";

export interface ToolDescriptor {
  name: string;
  description: string;
  availability: ToolAvailability;
  annotations?: { readOnlyHint?: boolean };
  inputSchema: Record<string, unknown>;
}

export const TOOL_CATALOG: ToolDescriptor[] = [
  {
    name: "get_workspace_state",
    description:
      "Read Nagara: Bengaluru voice counts by category, selected pin, and the current photo/area draft. Call this first.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "resolve_ward",
    description: "Resolve a Bengaluru area name or lng/lat to a GBA ward and corporation.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        areaName: { type: "string" },
        lng: { type: "number" },
        lat: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_voices",
    description: "List civic voices, optionally filtered by ward, category, or status.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        wardId: { type: "string" },
        category: { type: "string" },
        status: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_voice",
    description: "Read one voice: photos, ward, supporters, timeline, related tenders.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: { voiceId: { type: "string" } },
      required: ["voiceId"],
      additionalProperties: false,
    },
  },
  {
    name: "enrich_source",
    description:
      "Firecrawl-scrape an allowlisted civic URL (OpenCity or karnatakatenders.in) into JSON and attach it to the selected voice.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
      additionalProperties: false,
    },
  },
  {
    name: "list_related_tenders",
    description:
      "Return structured tender JSON for an area/ward/category (SWD, lake, UGD — not NH road packages).",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: {
        areaName: { type: "string" },
        wardId: { type: "string" },
        category: { type: "string" },
        query: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "file_voice",
    description:
      "File a civic voice from the current draft or explicit photo/area/category. Resolves the ward and drops a pin.",
    availability: "when_draft",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        areaName: { type: "string" },
        category: { type: "string" },
        lng: { type: "number" },
        lat: { type: "number" },
        photoUrl: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "classify_issue",
    description:
      "Suggest Flooding / Water / Lakes / Works / Encroach / Footpaths / Lights / Other from caption + area. Never defaults to pothole or waste.",
    availability: "when_draft",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "support_voice",
    description: "Join the selected voice instead of filing a duplicate.",
    availability: "when_selected",
    inputSchema: {
      type: "object",
      properties: { voiceId: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "focus_voice",
    description: "Pan the shared map to a voice so the human and agent look at the same pin.",
    availability: "when_selected",
    inputSchema: {
      type: "object",
      properties: { voiceId: { type: "string" } },
      required: ["voiceId"],
      additionalProperties: false,
    },
  },
];

export function toolsForState(commands: VoiceCommands): ToolDescriptor[] {
  const state = commands.getState();
  const hasDraft = Boolean(state.draft.photoUrl || state.draft.areaName);
  const hasSelected = Boolean(state.selectedVoiceId);
  return TOOL_CATALOG.filter((tool) => {
    if (tool.availability === "always") return true;
    if (tool.availability === "when_draft") return hasDraft || hasSelected;
    if (tool.availability === "when_selected") return hasSelected;
    return false;
  });
}

export function formatToolResult(result: CommandResult) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    isError: result.ok ? undefined : true,
  };
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  commands: VoiceCommands,
): Promise<CommandResult> {
  switch (name) {
    case "get_workspace_state":
      return { ok: true, summary: "City snapshot.", stateChanges: [], data: commands.getSnapshot() as unknown as Record<string, unknown> };
    case "resolve_ward":
      return commands.resolveWard({
        areaName: str(args.areaName),
        lng: num(args.lng),
        lat: num(args.lat),
      });
    case "list_voices":
      return commands.listVoices({
        category: str(args.category),
        wardId: str(args.wardId),
        status: str(args.status),
      });
    case "get_voice": {
      const id = str(args.voiceId);
      if (!id) return { ok: false, summary: "voiceId is required.", stateChanges: [] };
      return commands.getVoice(id);
    }
    case "list_related_tenders": {
      const tenders = listRelatedTenders({
        areaName: str(args.areaName),
        wardId: str(args.wardId),
        category: isCategory(args.category) ? args.category : undefined,
        query: str(args.query),
      });
      return { ok: true, summary: `${tenders.length} related tender(s).`, stateChanges: [], data: { tenders } };
    }
    case "file_voice":
      return commands.fileVoice({
        actor: "agent",
        title: str(args.title),
        body: str(args.body),
        areaName: str(args.areaName),
        category: isCategory(args.category) ? args.category : undefined,
        lng: num(args.lng),
        lat: num(args.lat),
        photoUrl: str(args.photoUrl),
      });
    case "classify_issue":
      return commands.classifyDraft();
    case "support_voice":
      return commands.supportVoice(str(args.voiceId));
    case "focus_voice": {
      const id = str(args.voiceId);
      if (!id) return { ok: false, summary: "voiceId is required.", stateChanges: [] };
      return commands.focusVoice(id);
    }
    case "enrich_source": {
      const url = str(args.url);
      if (!url) return { ok: false, summary: "url is required.", stateChanges: [] };
      const response = await fetch("/api/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as Record<string, unknown>;
      return {
        ok: response.ok,
        summary: response.ok ? "Source enriched." : "Enrich failed.",
        stateChanges: [],
        data,
      };
    }
    default:
      return { ok: false, summary: `Unknown tool: ${name}`, stateChanges: [] };
  }
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
