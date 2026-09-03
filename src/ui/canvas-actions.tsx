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
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) return;
    return editor.store.listen(() => setEpoch((value) => value + 1), {
      source: "all",
      scope: "all",
    });
  }, [editor]);

  const zoom = editor ? Math.round(editor.getZoomLevel() * 100) : 100;
  const canUndo = editor?.getCanUndo() ?? false;
  const canRedo = editor?.getCanRedo() ?? false;
  const selectedCount = editor?.getSelectedShapeIds().length ?? 0;
  const imageSelected =
    spatialIntent.kind === "clear" ||
    catalog.selection.assetIds.length === 1 ||
    (editor?.getSelectedShapes().some((shape) => shape.type === "image") ?? false);
  const running = catalog.jobs.some(
    (job) => job.status === "running" || job.status === "queued",
  );

  void epoch;

  return (
    <div className="canvas-chrome">
      {imageSelected || selectedCount > 0 ? (
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
            onClick={() => setStatus(commands.duplicateSelection().summary)}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ghost icon-btn"
            disabled={!imageSelected || running}
            aria-label="Remove background"
            title="Remove background"
            onClick={async () => {
              const result = await commands.removeBackground({ actor: "human" });
              setStatus(result.summary);
            }}
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
          <span className="chrome-rule" />
          <button
            type="button"
            className="ghost icon-btn"
            disabled={selectedCount === 0}
            aria-label="Bring to front"
            title="Bring to front"
            onClick={() => editor?.bringToFront(editor.getSelectedShapeIds())}
          >
            <BringToFront className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="ghost icon-btn"
            disabled={selectedCount === 0}
            aria-label="Send to back"
            title="Send to back"
            onClick={() => editor?.sendToBack(editor.getSelectedShapeIds())}
          >
            <SendToBack className="h-4 w-4" />
          </button>
          {isolateOpen ? (
            <form
              className="isolate-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const result = await commands.isolateObject({
                  actor: "human",
                  object: isolateTarget,
                });
                setStatus(result.summary);
                setIsolateOpen(false);
              }}
            >
              <input
                autoFocus
                className="prompt-input isolate-input"
                placeholder="What to isolate? e.g. the glasses"
                value={isolateTarget}
                onChange={(event) => setIsolateTarget(event.target.value)}
              />
              <button type="submit" className="solid" disabled={running}>
                Isolate
              </button>
            </form>
          ) : null}
        </div>
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
          onClick={() =>
            editor?.zoomOut(editor.getViewportScreenCenter(), { animation: { duration: 160 } })
          }
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="ghost zoom-pct"
          aria-label="Reset zoom"
          title="Reset zoom"
          onClick={() =>
            editor?.resetZoom(editor.getViewportScreenCenter(), { animation: { duration: 160 } })
          }
        >
          {zoom}%
        </button>
        <button
          type="button"
          className="ghost icon-btn"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() =>
            editor?.zoomIn(editor.getViewportScreenCenter(), { animation: { duration: 160 } })
          }
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="ghost icon-btn"
          aria-label="Fit canvas"
          title="Fit"
          onClick={() => editor?.zoomToFit({ animation: { duration: 200 } })}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      {status ? <p className="canvas-chrome-status">{status}</p> : null}
    </div>
  );

  async function downloadSelection() {
    const { createTldrawCanvasPort } = await import("@/adapters/tldraw/canvas-port");
    const file = await createTldrawCanvasPort(() => editor).exportSelection();
    if (!file) {
      setStatus("Select something to download.");
      return;
    }
    const a = document.createElement("a");
    a.href = file.href;
    a.download = `${catalog.name.replace(/\s+/g, "-").toLowerCase()}-selection.png`;
    a.click();
  }
}
