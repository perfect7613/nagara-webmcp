"use client";

import { useEffect, useRef, useState } from "react";
import { GitBranch, WandSparkles } from "lucide-react";
import { maskToPngDataUrl, type SpatialIntent } from "@/modules/spatial-intent";
import { useWorkspace } from "@/ui/workspace-provider";

export function PromptBar({
  spatialIntent,
  graphOpen,
  onToggleGraph,
}: {
  spatialIntent: SpatialIntent;
  graphOpen: boolean;
  onToggleGraph: () => void;
}) {
  const { catalog, commands } = useWorkspace();
  const extracted =
    spatialIntent.kind === "clear" ? spatialIntent.notes.join(" ").trim() : "";
  const [instruction, setInstruction] = useState(extracted);
  const [status, setStatus] = useState<string | null>(null);
  const extractedRef = useRef(extracted);
  const instructionRef = useRef(instruction);
  const spatialRef = useRef(spatialIntent);
  const catalogRef = useRef(catalog);
  const running = catalog.jobs.some(
    (job) => job.status === "running" || job.status === "queued",
  );
  const canEdit =
    spatialIntent.kind === "clear" ||
    catalog.selection.assetIds.length === 1 ||
    catalog.placements.length > 0;

  instructionRef.current = instruction;
  spatialRef.current = spatialIntent;
  catalogRef.current = catalog;

  useEffect(() => {
    if (extracted && (instruction === "" || instruction === extractedRef.current)) {
      setInstruction(extracted);
    }
    extractedRef.current = extracted;
  }, [extracted, instruction]);

  useEffect(() => {
    const run = () => void runEdit();
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return;
      event.preventDefault();
      run();
    };
    window.addEventListener("keepers:run-edit", run);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keepers:run-edit", run);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="prompt-bar">
      <button
        type="button"
        className={graphOpen ? "ghost is-on" : "ghost"}
        aria-pressed={graphOpen}
        onClick={onToggleGraph}
      >
        <GitBranch className="h-3.5 w-3.5" aria-hidden />
        History
      </button>
      <input
        className="prompt-input"
        value={instruction}
        placeholder={
          spatialIntent.kind === "clear"
            ? "What should change? e.g. add a hat"
            : "Place a photo, point at it, then type the edit"
        }
        onChange={(event) => setInstruction(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void runEdit();
          }
        }}
      />
      <button
        type="button"
        className="solid"
        disabled={!canEdit || running}
        onClick={() => void runEdit()}
      >
        <WandSparkles className="h-3.5 w-3.5" aria-hidden />
        {running ? "Editing…" : "Edit"}
        <kbd className="prompt-kbd">⌘↵</kbd>
      </button>
      {status ? <p className="prompt-status">{status}</p> : null}
    </div>
  );

  async function runEdit() {
    const text = instructionRef.current.trim();
    const intent = spatialRef.current;
    const current = catalogRef.current;
    if (!text) {
      setStatus("Type the edit first. Example: add a hat.");
      return;
    }
    if (current.placements.length === 0 && current.selection.assetIds.length > 0) {
      const placed = commands.placePhotos({
        assetIds: current.selection.assetIds,
        actor: "human",
      });
      if (!placed.ok) {
        setStatus(placed.summary);
        return;
      }
    }
    if (!current.consent.externalProvider) commands.grantConsent();
    const result = await commands.startImageJob({
      actor: "human",
      instruction: text,
      versionId: intent.kind === "clear" ? intent.target.versionId || undefined : undefined,
      placementId:
        intent.kind === "clear" ? intent.target.placementId || undefined : undefined,
      region: intent.kind === "clear" ? intent.region : undefined,
      maskPng:
        intent.kind === "clear" && intent.mask ? maskToPngDataUrl(intent.mask) : undefined,
    });
    setStatus(result.summary);
  }
}
