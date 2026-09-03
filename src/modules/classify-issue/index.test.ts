import { describe, expect, it } from "vitest";
import { classifyIssue } from "@/modules/classify-issue";
import { listRelatedTenders } from "@/modules/tenders";
import { fromAreaName, fromPoint } from "@/modules/ward-lookup";
import { createVoiceCommands, emptyCity } from "@/modules/voice-command";

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
});

describe("tenders", () => {
  it("returns SWD rows for flooding in HSR", () => {
    const rows = listRelatedTenders({ category: "flooding", areaName: "HSR" });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.refNo).toBeTruthy();
  });
});
