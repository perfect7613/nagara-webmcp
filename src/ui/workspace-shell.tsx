"use client";
"use no memo";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { Editor } from "tldraw";
import { Image as ImageIcon } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { WebMcpBridge } from "@/adapters/webmcp/bridge";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/domain/product";
import { resolveSpatialIntent } from "@/modules/spatial-intent";
import { AgentDock } from "@/ui/agent-dock";
import { CanvasActions } from "@/ui/canvas-actions";
import { KeepersTldraw } from "@/ui/keepers-tldraw";
import { PhotoTray } from "@/ui/photo-tray";
import { PromptBar } from "@/ui/prompt-bar";
import { TopBar } from "@/ui/top-bar";
import { useCanvasView } from "@/ui/use-canvas-view";
import { useIngestPhotos } from "@/ui/use-ingest-photos";
import { VariantRail } from "@/ui/variant-rail";
import {
  clearWorkspaceCatalog,
  useWorkspace,
} from "@/ui/workspace-provider";

export function WorkspaceShell() {
  const { catalog, commands, setEditor, editor } = useWorkspace();
  const { ingestFiles } = useIngestPhotos();
  const [webmcpReady, setWebmcpReady] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(false);
  const hostRef = useRef<HTMLElement>(null);
  const canvasView = useCanvasView(editor);
  const pageHasImages =
    canvasView.images.length > 0 ||
    catalog.placements.length > 0 ||
    (editor
      ? editor.getCurrentPageShapes().some((shape) => shape.type === "image")
      : false);

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setTrayOpen(false);
      setDockOpen(false);
      setGraphOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!editor) return;
    commands.syncCanvas(canvasView);
  }, [commands, canvasView, editor]);

  const spatialIntent = useMemo(
    () => resolveSpatialIntent(canvasView),
    [canvasView],
  );

  return (
    <SidebarProvider open={trayOpen} setOpen={setTrayOpen} animate={false}>
      <div className="workspace is-kanvas">
        <section
          ref={hostRef}
          className="light-table keepers-canvas"
          aria-label="Shared canvas"
          onDragOverCapture={handleDragOver}
          onDropCapture={handleDrop}
        >
          {!pageHasImages ? (
            <div className="light-table-hint">
              <span className="icon-well large">
                <ImageIcon className="h-5 w-5" />
              </span>
              <p>The table is infinite.</p>
              <p className="muted">
                Place a photo, then draw or type an edit in the bar below.
              </p>
            </div>
          ) : null}
          <KeepersTldraw
            onEditor={(next) => {
              setEditor(next);
              if (!next) return;
              const supported =
                typeof document.modelContext?.registerTool === "function";
              setWebmcpReady(supported);
            }}
          />
        </section>
        <div className="float-layer">
          <TopBar
            name={catalog.name}
            webmcpReady={webmcpReady}
            dockOpen={dockOpen}
            onToggleDock={() => setDockOpen((value) => !value)}
            onExport={async () => {
              const file = await createTldrawCanvasPortSafe(editor);
              if (!file) return;
              const a = document.createElement("a");
              a.href = file.href;
              a.download = `${catalog.name.replace(/\s+/g, "-").toLowerCase()}.png`;
              a.click();
            }}
            onClear={clearWorkspaceCatalog}
          />
          {trayOpen ? <PhotoTray /> : null}
          {dockOpen || graphOpen ? (
            <div className="right-islands">
              {dockOpen ? <AgentDock spatialIntent={spatialIntent} /> : null}
              {graphOpen ? <VariantRail /> : null}
            </div>
          ) : null}
          <CanvasActions spatialIntent={spatialIntent} />
          <PromptBar
            spatialIntent={spatialIntent}
            graphOpen={graphOpen}
            onToggleGraph={() => setGraphOpen((value) => !value)}
          />
        </div>
        <WebMcpBridge
          commands={commands}
          catalog={catalog}
          spatialIntent={spatialIntent}
          canvasView={canvasView}
        />
        <p className="sr-only">
          {PRODUCT_NAME}. {PRODUCT_TAGLINE}
        </p>
      </div>
    </SidebarProvider>
  );

  function handleDragOver(event: DragEvent) {
    if (![...event.dataTransfer.types].includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent) {
    const files = [...event.dataTransfer.files].filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    void ingestFiles(files, true);
  }
}

async function createTldrawCanvasPortSafe(editor: Editor | null) {
  if (!editor) return null;
  const { createTldrawCanvasPort } = await import("@/adapters/tldraw/canvas-port");
  return createTldrawCanvasPort(() => editor).exportFrame();
}
