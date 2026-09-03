"use client";

import { useEffect, useState } from "react";
import {
  BringToFront,
  Copy,
  Download,
  Maximize2,
  Redo2,
  ScanSearch,
  Scissors,
  SendToBack,
  Undo2,
  WandSparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Editor } from "@quickdrawjs/core";
import type { SpatialIntent } from "@/modules/spatial-intent";
import { useWorkspace } from "@/ui/workspace-provider";

export function CanvasActions({
  spatialIntent,
}: {
  spatialIntent: SpatialIntent;
}) {
  const { catalog, commands, editor } = useWorkspace();
  const [epoch, setEpoch] = useState(0);
  const [isolateOpen, setIsolateOpen] = useState(false);
  const [isolateTarget, setIsolateTarget] = useState("");

  useEffect(() => {
    if (!editor) return;
    const bump = () => setEpoch((value) => value + 1);
    const unlisten = editor.store.listen(bump, { source: "user" });
    const unlistenHistory = editor.store.listenHistory(bump);
    const unlistenSelection = editor.on("selection", bump);
    const unlistenCamera = editor.on("camera", bump);
    return () => {
      unlisten();
      unlistenHistory();
      unlistenSelection();
      unlistenCamera();
    };
  }, [editor]);

  const zoom = editor ? Math.round(editor.camera.z * 100) : 100;
  const canUndo = editor?.store.canUndo ?? false;
  const canRedo = editor?.store.canRedo ?? false;
  const selectedCount = editor?.selection.size ?? 0;
  const imageSelected =
    spatialIntent.kind === "clear" ||
    (editor
      ? [...editor.selection].some((id) => {
          const rec = editor.store.get(id);
          return rec?.typeName === "shape" && rec.type === "image";
        })
      : false);
  const showSelection = imageSelected || selectedCount > 0;
  const running = catalog.jobs.some(
    (job) => job.status === "running" || job.status === "queued",
  );

  useEffect(() => {
    if (!showSelection) setIsolateOpen(false);
  }, [showSelection]);

  void epoch;

  return (
    <div className="canvas-chrome">
      {showSelection ? (
        <div className="chrome-island selection-actions">
          <button
            type="button"
            className="ghost icon-btn"
            disabled={!imageSelected || running}
            aria-label="Run edit"
            title="Run edit (⌘↵)"
            onClick={() => window.dispatchEvent(new Event("keepers:run-edit"))}
          >
            <WandSparkles className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ghost icon-btn"
            disabled={selectedCount === 0}
            aria-label="Duplicate"
            title="Duplicate"
            onClick={() => commands.duplicateSelection()}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ghost icon-btn"
            disabled={!imageSelected || running}
            aria-label="Remove background"
            title="Remove background"
            onClick={() => void commands.removeBackground({ actor: "human" })}
          >
            <Scissors className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={isolateOpen ? "ghost icon-btn is-on" : "ghost icon-btn"}
            disabled={!imageSelected || running}
            aria-label="Isolate object"
            title="Isolate object"
            aria-pressed={isolateOpen}
            onClick={() => setIsolateOpen((value) => !value)}
          >
            <ScanSearch className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ghost icon-btn"
            disabled={selectedCount === 0}
            aria-label="Download selection"
            title="Download selection"
            onClick={() => void downloadSelection()}
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ghost icon-btn"
            disabled={selectedCount === 0}
            aria-label="Bring to front"
            title="Bring to front"
            onClick={() => editor?.bringToFront()}
          >
            <BringToFront className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ghost icon-btn"
            disabled={selectedCount === 0}
            aria-label="Send to back"
            title="Send to back"
            onClick={() => editor?.sendToBack()}
          >
            <SendToBack className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {isolateOpen ? (
        <form
          className="chrome-island isolate-form"
          onSubmit={(event) => {
            event.preventDefault();
            void commands.isolateObject({
              actor: "human",
              object: isolateTarget,
            });
            setIsolateOpen(false);
          }}
        >
          <input
            autoFocus
            className="prompt-input isolate-input"
            placeholder="What to isolate?"
            value={isolateTarget}
            onChange={(event) => setIsolateTarget(event.target.value)}
          />
          <button type="submit" className="solid" disabled={running}>
            Isolate
          </button>
        </form>
      ) : null}
      <div className="chrome-island zoom-island">
        <button
          type="button"
          className="ghost icon-btn"
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
          onClick={() => commands.undoCanvas()}
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="ghost icon-btn"
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
          onClick={() => commands.redoCanvas()}
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <span className="chrome-rule" />
        <button
          type="button"
          className="ghost icon-btn"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => zoomBy(editor, 1 / 1.25)}
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="ghost zoom-pct"
          aria-label="Reset zoom"
          title="Reset zoom"
          onClick={() => {
            if (!editor) return;
            zoomBy(editor, 1 / Math.max(editor.camera.z, 0.01));
          }}
        >
          {zoom}%
        </button>
        <button
          type="button"
          className="ghost icon-btn"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => zoomBy(editor, 1.25)}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="ghost icon-btn"
          aria-label="Fit canvas"
          title="Fit"
          onClick={() => editor?.fitContent({ animate: 200 })}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  async function downloadSelection() {
    const { createCanvasPort } = await import("@/adapters/quickdraw/canvas-port");
    const file = await createCanvasPort(() => editor).exportSelection();
    if (!file) return;
    const a = document.createElement("a");
    a.href = file.href;
    a.download = `${catalog.name.replace(/\s+/g, "-").toLowerCase()}-selection.png`;
    a.click();
  }
}

function zoomBy(editor: Editor | null, mult: number) {
  if (!editor) return;
  const { w, h } = editor.viewSize();
  editor.zoomAt(w / 2, h / 2, mult, { animate: 160 });
}
