import type { CommandResult } from "@/domain/types";
import { CATEGORIES } from "@/domain/categories";
import { GITHUB_REPO, LIVE_URL } from "@/domain/product";
import { isCategory } from "@/modules/classify-issue";
import { hydrateTenders, listRelatedTenders } from "@/modules/tenders";
import type { VoiceCommands } from "@/modules/voice-command";

export type ToolAvailability = "always";

export interface ToolDescriptor {
  name: string;
  title: string;
  description: string;
  availability: ToolAvailability;
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
  inputSchema: Record<string, unknown>;
}

export const TOOL_CATALOG: ToolDescriptor[] = [
  {
    name: "list_ui_actions",
    title: "List visible Nagara actions",
    description:
      "Start here. Lists every meaningful link, button, form control, map action, and its matching WebMCP tool for the current Nagara page.",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "navigate_app",
    title: "Navigate Nagara",
    description:
      "Use Nagara navigation and call-to-action links without guessing at the DOM. Opens the home, city overview, filing map, How it works section, agent guide, or latest voice.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        destination: {
          type: "string",
          enum: ["home", "overview", "map", "how-it-works", "agent-guide", "latest-voice"],
          description: "The labeled destination to open.",
        },
      },
      required: ["destination"],
      additionalProperties: false,
    },
  },
  {
    name: "get_workspace_state",
    title: "Read the Nagara workspace",
    description:
      "Read Nagara first. Returns voice counts, the selected pin, and the filing form (photo, area name, title, body, category).",
    availability: "always",
    annotations: { readOnlyHint: true },
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "set_draft",
    title: "Fill the visible filing form",
    description:
      "Fill the filing form the human can see. Pass areaName (HSR Layout, Bellandur, Whitefield) and optional photoUrl, title, body, category. Then call file_voice.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        photoUrl: { type: "string", format: "uri", description: "Public evidence image URL." },
        photoName: { type: "string", description: "Human-readable evidence filename." },
        areaName: { type: "string", description: "Bengaluru locality, for example HSR Layout." },
        title: { type: "string", description: "Short, factual civic issue title." },
        body: { type: "string", description: "What failed and what the evidence shows." },
        category: { type: "string", enum: CATEGORIES },
        lng: { type: "number" },
        lat: { type: "number" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "select_category",
    title: "Choose an issue category",
    description:
      "Press one of the visible issue-category chips on the filing form. The selected chip updates immediately.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: { category: { type: "string", enum: CATEGORIES } },
      required: ["category"],
      additionalProperties: false,
    },
  },
  {
    name: "clear_draft",
    title: "Clear the filing form",
    description: "Clear the visible evidence, area, title, description, category, and coordinates from the filing form.",
    availability: "always",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "attach_photo",
    title: "Attach an evidence photo",
    description:
      "Host a public image URL through UploadThing and put it on the form. Use this when Codex or ChatGPT has a photo URL. Then set_draft areaName and file_voice.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        photoUrl: { type: "string", format: "uri" },
        name: { type: "string" },
      },
      required: ["photoUrl"],
      additionalProperties: false,
    },
  },
  {
    name: "resolve_ward",
    title: "Resolve a GBA ward",
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
    title: "Classify a civic issue",
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
    title: "File a civic voice",
    description:
      "File the voice and drop a pin. Needs a photo (photoUrl or the form) and an area name. Resolves the ward, classifies if needed, then selects the new pin.",
    availability: "always",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        body: { type: "string" },
        areaName: { type: "string" },
        category: { type: "string", enum: CATEGORIES },
        lng: { type: "number" },
        lat: { type: "number" },
        photoUrl: { type: "string", format: "uri" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "use_current_location",
    title: "Use the resident's location",
    description:
      "Equivalent to the visible Use my location button. Requests browser geolocation, updates the visible draft coordinates, and resolves the matching GBA ward. The browser may ask the person for permission.",
    availability: "always",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_voices",
    title: "List civic voices",
    description: "List civic voices, optionally filtered by ward, category, or status.",
    availability: "always",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        wardId: { type: "string" },
        category: { type: "string", enum: CATEGORIES },
        status: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_voice",
    title: "Read a civic voice",
    description: "Read one voice: photos, ward, supporters, timeline, related public records.",
    availability: "always",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: { voiceId: { type: "string" } },
      required: ["voiceId"],
      additionalProperties: false,
    },
  },
  {
    name: "focus_voice",
    title: "Focus a map pin",
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
    title: "Join a civic voice",
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
    title: "List related public records",
    description: "Return public stormwater, lake, UGD, and water records for an area or category.",
    availability: "always",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        areaName: { type: "string" },
        wardId: { type: "string" },
        category: { type: "string", enum: CATEGORIES },
        query: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_link_target",
    title: "Get a visible link target",
    description:
      "Resolve the URL behind Nagara's visible Source, live app, or selected public-record link so the agent can open it deliberately.",
    availability: "always",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        link: { type: "string", enum: ["source-code", "live-app", "selected-record"] },
      },
      required: ["link"],
      additionalProperties: false,
    },
  },
  {
    name: "enrich_source",
    title: "Enrich a civic source",
    description:
      "Firecrawl-scrape an allowlisted civic URL (OpenCity, karnatakatenders.in, The News Minute) into JSON.",
    availability: "always",
    annotations: { untrustedContentHint: true },
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", format: "uri" } },
      required: ["url"],
      additionalProperties: false,
    },
  },
  {
    name: "refresh_tenders",
    title: "Refresh public records",
    description: "Pull live OpenCity stormwater and lake records into the map catalog.",
    availability: "always",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

export interface WebMcpEnvironment {
  pathname: string;
  navigate: (href: string) => void;
  locate: () => Promise<{ lng: number; lat: number }>;
}

const UI_ACTIONS = {
  "/": [
    { control: "Enter the world", tool: "navigate_app", input: { destination: "overview" } },
  ],
  "/world": [
    { control: "How it works", tool: "navigate_app", input: { destination: "how-it-works" } },
    { control: "For agents", tool: "navigate_app", input: { destination: "agent-guide" } },
    { control: "Map / File a voice / Open the map", tool: "navigate_app", input: { destination: "map" } },
    { control: "Open latest voice", tool: "navigate_app", input: { destination: "latest-voice" } },
    { control: "Source", tool: "get_link_target", input: { link: "source-code" } },
  ],
  "/create": [
    { control: "World / Nagara wordmark", tool: "navigate_app", input: { destination: "overview" } },
    { control: "Use my location", tool: "use_current_location", input: {} },
    { control: "Evidence photo picker/drop zone", tool: "attach_photo or set_draft", input: { photoUrl: "https://…" } },
    { control: "Area, title, and description fields", tool: "set_draft", input: {} },
    { control: "Issue category chips", tool: "select_category", input: { category: "flooding" } },
    { control: "Put it on record", tool: "file_voice", input: {} },
    { control: "Clear form", tool: "clear_draft", input: {} },
    { control: "Map pins", tool: "focus_voice", input: { voiceId: "…" } },
    { control: "Join this voice", tool: "support_voice", input: { voiceId: "…" } },
    { control: "Open source", tool: "get_link_target", input: { link: "selected-record" } },
  ],
} as const;

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
  environment?: WebMcpEnvironment,
): Promise<CommandResult> {
  const result = await runTool(name, args, commands, environment);
  const descriptor = TOOL_CATALOG.find((tool) => tool.name === name);
  if (!descriptor?.annotations?.readOnlyHint) {
    commands.logActivity({ tool: name, summary: result.summary, actor: "agent" });
  }
  return result;
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
  commands: VoiceCommands,
  environment?: WebMcpEnvironment,
): Promise<CommandResult> {
  switch (name) {
    case "list_ui_actions": {
      const pathname = environment?.pathname ?? "/";
      const actions = UI_ACTIONS[pathname as keyof typeof UI_ACTIONS] ?? UI_ACTIONS["/"];
      return {
        ok: true,
        summary: `${actions.length} visible interaction(s) mapped to WebMCP on ${pathname}.`,
        stateChanges: [],
        data: { pathname, actions, coverage: "Every meaningful Nagara control has a semantic tool." },
      };
    }
    case "navigate_app": {
      if (!environment) return { ok: false, summary: "Navigation is unavailable.", stateChanges: [] };
      const destination = str(args.destination);
      const latestId = commands.getState().voices[0]?.id;
      const hrefs: Record<string, string> = {
        home: "/",
        overview: "/world",
        map: "/create",
        "how-it-works": "/world#how",
        "agent-guide": "/world#agent",
        "latest-voice": latestId ? `/create?voice=${encodeURIComponent(latestId)}` : "/create",
      };
      const href = destination ? hrefs[destination] : undefined;
      if (!href) return { ok: false, summary: "Choose a valid Nagara destination.", stateChanges: [] };
      environment.navigate(href);
      return { ok: true, summary: `Opening ${destination}.`, stateChanges: ["navigation"], data: { href } };
    }
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
    case "select_category":
      if (!isCategory(args.category)) {
        return { ok: false, summary: "Choose a valid issue category.", stateChanges: [] };
      }
      return commands.setDraft({ category: args.category });
    case "clear_draft":
      return commands.clearDraft();
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
    case "use_current_location": {
      if (!environment) return { ok: false, summary: "Geolocation is unavailable.", stateChanges: [] };
      try {
        const point = await environment.locate();
        commands.setDraft(point);
        const ward = commands.resolveWard(point);
        return {
          ...ward,
          summary: ward.ok ? `Location added. ${ward.summary}` : ward.summary,
          stateChanges: ward.ok ? ["draft.coordinates"] : [],
          data: { ...(ward.data ?? {}), coordinates: point },
        };
      } catch (error) {
        return {
          ok: false,
          summary: error instanceof Error ? error.message : "Location permission was not granted.",
          stateChanges: [],
        };
      }
    }
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
    case "get_link_target": {
      const link = str(args.link);
      if (link === "source-code") {
        return { ok: true, summary: "Nagara source repository.", stateChanges: [], data: { url: GITHUB_REPO } };
      }
      if (link === "live-app") {
        return { ok: true, summary: "Nagara live app.", stateChanges: [], data: { url: LIVE_URL } };
      }
      if (link === "selected-record") {
        const selected = commands.getState().voices.find((voice) => voice.id === commands.getState().selectedVoiceId);
        const url = selected?.tenders.find((tender) => tender.detailUrl)?.detailUrl;
        if (!url) return { ok: false, summary: "The selected voice has no public-record link.", stateChanges: [] };
        return { ok: true, summary: "Selected public-record source.", stateChanges: [], data: { url } };
      }
      return { ok: false, summary: "Choose a valid visible link.", stateChanges: [] };
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
