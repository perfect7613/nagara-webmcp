import { describe, expect, it } from "vitest";
import { classifyIssue } from "@/modules/classify-issue";
import { listRelatedTenders } from "@/modules/tenders";
import { fromAreaName, fromPoint } from "@/modules/ward-lookup";
import { createVoiceCommands, emptyCity } from "@/modules/voice-command";
import { executeTool, TOOL_CATALOG } from "@/modules/webmcp-registry";

describe("classifyIssue", () => {
  it("maps flood captions to flooding", () => {
    expect(classifyIssue("street waterlogged after rain in HSR").category).toBe("flooding");
  });
  it("maps tanker captions to water", () => {
    expect(classifyIssue("tanker queue, no Cauvery line").category).toBe("water");
  });
  it("maps lake captions to lakes", () => {
    expect(classifyIssue("Bellandur lake foam on the bund").category).toBe("lakes");
  });
  it("does not default to waste or roads", () => {
    expect(classifyIssue("something is wrong here").category).toBeNull();
  });
});

describe("ward lookup", () => {
  it("matches HSR by name", () => {
    expect(fromAreaName("HSR Layout")?.name).toBe("HSR Layout");
  });
  it("matches a point inside Bellandur bbox", () => {
    expect(fromPoint(77.6765, 12.9255)?.name).toBe("Bellandur");
  });
});

describe("voices", () => {
  it("file_voice enables support_voice", () => {
    let state = emptyCity();
    const commands = createVoiceCommands(
      () => state,
      (next) => {
        state = next;
      },
    );
    const filed = commands.fileVoice({
      actor: "human",
      photoUrl: "https://example.com/flood.jpg",
      areaName: "HSR Layout",
      category: "flooding",
      title: "SWD overflow into houses",
    });
    expect(filed.ok).toBe(true);
    const id = (filed.data?.voice as { id: string }).id;
    const supported = commands.supportVoice(id);
    expect(supported.ok).toBe(true);
  });

  it("lets an agent fill the form then file a voice", () => {
    let state = emptyCity();
    const commands = createVoiceCommands(
      () => state,
      (next) => {
        state = next;
      },
    );
    commands.setDraft({
      photoUrl: "https://example.com/bellandur.jpg",
      areaName: "Bellandur",
      title: "Sewage still enters the lake",
      body: "The stormwater inlet on the bund is untreated.",
      category: "lakes",
    });
    const filed = commands.fileVoice({ actor: "agent" });
    expect(filed.ok).toBe(true);
    expect(state.selectedVoiceId).toBeTruthy();
  });
});

describe("tenders", () => {
  it("returns SWD rows for flooding in HSR", () => {
    const rows = listRelatedTenders({ category: "flooding", areaName: "HSR" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.refNo).toBeTruthy();
  });
});

describe("WebMCP interaction coverage", () => {
  it("publishes a semantic mapping for every visible map interaction", async () => {
    let state = emptyCity();
    const commands = createVoiceCommands(
      () => state,
      (next) => {
        state = next;
      },
    );
    const result = await executeTool("list_ui_actions", {}, commands, {
      pathname: "/create",
      navigate: () => {},
      locate: async () => ({ lng: 77.6765, lat: 12.9255 }),
    });
    const actions = result.data?.actions as unknown[];
    expect(result.ok).toBe(true);
    expect(actions).toHaveLength(10);
    expect(actions.map((action) => JSON.stringify(action)).join(" ")).toContain("Put it on record");
    expect(actions.map((action) => JSON.stringify(action)).join(" ")).toContain("Clear form");
  });

  it("exposes navigation, category chips, geolocation, and clear-form actions", async () => {
    let state = emptyCity();
    let navigatedTo = "";
    const commands = createVoiceCommands(
      () => state,
      (next) => {
        state = next;
      },
    );
    const environment = {
      pathname: "/create",
      navigate: (href: string) => {
        navigatedTo = href;
      },
      locate: async () => ({ lng: 77.6765, lat: 12.9255 }),
    };

    expect(TOOL_CATALOG).toHaveLength(19);
    expect((await executeTool("select_category", { category: "lakes" }, commands, environment)).ok).toBe(true);
    expect(state.draft.category).toBe("lakes");
    expect((await executeTool("use_current_location", {}, commands, environment)).ok).toBe(true);
    expect(state.draft.lng).toBe(77.6765);
    expect((await executeTool("navigate_app", { destination: "overview" }, commands, environment)).ok).toBe(true);
    expect(navigatedTo).toBe("/world");
    expect((await executeTool("clear_draft", {}, commands, environment)).ok).toBe(true);
    expect(state.draft.category).toBeNull();
  });
});
