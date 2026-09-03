import type { CommandResult } from "@/domain/types";
import { isCategory } from "@/modules/classify-issue";
import { hydrateTenders, listRelatedTenders } from "@/modules/tenders";
import type { VoiceCommands } from "@/modules/voice-command";

export type ToolAvailability = "always";

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
      "Read Nagara first. Returns voice counts, the selected pin, and the filing form (photo, area name, title, body, category).",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "set_draft",
    description:
      "Fill the filing form the human can see. Pass areaName (HSR Layout, Bellandur, Whitefield) and optional photoUrl, title, body, category. Then call file_voice.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        photoUrl: { type: "string" },
        photoName: { type: "string" },
        areaName: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        category: { type: "string" },
        lng: { type: "number" },
        lat: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "attach_photo",
    description:
      "Host a public image URL through UploadThing and put it on the form. Use this when Codex or ChatGPT has a photo URL. Then set_draft areaName and file_voice.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        photoUrl: { type: "string" },
        name: { type: "string" },
      },
      required: ["photoUrl"],
      additionalProperties: false,
    },
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
    name: "classify_issue",
    description:
      "Suggest Flooding, Water, Lakes, or Works from a caption. Pass caption if the form is still empty. Never default to pothole or waste.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: "object",
      properties: { caption: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "file_voice",
    description:
      "File the voice and drop a pin. Needs a photo (photoUrl or the form) and an area name. Resolves the ward, classifies if needed, then selects the new pin.",
    availability: "always",
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
    description: "Read one voice: photos, ward, supporters, timeline, related public records.",
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
    name: "focus_voice",
    description: "Pan the shared map to a voice so the human and agent look at the same pin.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: { voiceId: { type: "string" } },
      required: ["voiceId"],
      additionalProperties: false,
    },
  },
  {
    name: "support_voice",
    description: "Join this voice instead of filing a duplicate.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: { voiceId: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "list_related_tenders",
    description: "Return public stormwater, lake, UGD, and water records for an area or category.",
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
    name: "enrich_source",
    description:
      "Firecrawl-scrape an allowlisted civic URL (OpenCity, karnatakatenders.in, The News Minute) into JSON.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
      additionalProperties: false,
    },
  },
  {
    name: "refresh_tenders",
    description: "Pull live OpenCity stormwater and lake records into the map catalog.",
    availability: "always",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

export function toolsForState(): ToolDescriptor[] {
  return TOOL_CATALOG;
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
  const result = await runTool(name, args, commands);
  if (name !== "get_workspace_state") {
    commands.logActivity({ tool: name, summary: result.summary, actor: "agent" });
  }
  return result;
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  commands: VoiceCommands,
): Promise<CommandResult> {
  switch (name) {
    case "get_workspace_state":
      return {
        ok: true,
        summary: "City snapshot.",
        stateChanges: [],
        data: commands.getSnapshot() as unknown as Record<string, unknown>,
      };
    case "set_draft":
      return commands.setDraft({
        photoUrl: str(args.photoUrl),
        photoName: str(args.photoName),
        areaName: str(args.areaName),
        title: str(args.title),
        body: str(args.body),
        category: isCategory(args.category) ? args.category : undefined,
        lng: num(args.lng),
        lat: num(args.lat),
      });
    case "attach_photo": {
      const photoUrl = str(args.photoUrl);
      if (!photoUrl) return { ok: false, summary: "photoUrl is required.", stateChanges: [] };
      const response = await fetch("/api/attach-photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photoUrl, name: str(args.name) }),
      });
      const data = (await response.json()) as { photoUrl?: string; name?: string; error?: string };
      const hosted = data.photoUrl ?? photoUrl;
      return commands.setDraft({ photoUrl: hosted, photoName: data.name ?? str(args.name) });
    }
    case "resolve_ward":
      return commands.resolveWard({
        areaName: str(args.areaName),
        lng: num(args.lng),
        lat: num(args.lat),
      });
    case "classify_issue":
      return commands.classifyDraft(str(args.caption));
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
    case "focus_voice": {
      const id = str(args.voiceId);
      if (!id) return { ok: false, summary: "voiceId is required.", stateChanges: [] };
      return commands.focusVoice(id);
    }
    case "support_voice":
      return commands.supportVoice(str(args.voiceId));
    case "list_related_tenders": {
      const tenders = listRelatedTenders({
        areaName: str(args.areaName),
        wardId: str(args.wardId),
        category: isCategory(args.category) ? args.category : undefined,
        query: str(args.query),
      });
      return { ok: true, summary: `${tenders.length} related record(s).`, stateChanges: [], data: { tenders } };
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
    case "refresh_tenders": {
      const response = await fetch("/api/tenders");
      const data = (await response.json()) as { tenders?: ReturnType<typeof listRelatedTenders>; live?: boolean };
      if (data.tenders) hydrateTenders(data.tenders);
      return {
        ok: response.ok,
        summary: data.live ? `Live catalog: ${data.tenders?.length ?? 0} records.` : "Using bundled OpenCity and news records.",
        stateChanges: ["tenders"],
        data: data as Record<string, unknown>,
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
