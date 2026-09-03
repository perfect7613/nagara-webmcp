"use client";

import { useMemo, useState } from "react";
import { Tldraw, type Editor, type TLComponents, type TLUiOverrides } from "tldraw";
import "tldraw/tldraw.css";
import { WebMcpBridge } from "@/adapters/webmcp/bridge";
import { readCanvasView } from "@/adapters/tldraw/canvas-port";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/domain/product";
import { resolveSpatialIntent } from "@/modules/spatial-intent";
import { AgentDock } from "@/ui/agent-dock";
import { PhotoTray } from "@/ui/photo-tray";
import { TopBar } from "@/ui/top-bar";
import { VariantRail } from "@/ui/variant-rail";
import { useWorkspace } from "@/ui/workspace-provider";

export function WorkspaceShell() {
  const { catalog, commands, setEditor, editor } = useWorkspace();
  const [webmcpReady, setWebmcpReady] = useState(false);

  const spatialIntent = useMemo(
    () => resolveSpatialIntent(readCanvasView(editor)),
    [editor, catalog.updatedAt, catalog.selection],
  );

  const components: TLComponents = {
    SharePanel: null,
    MenuPanel: null,
    NavigationPanel: null,
  };

  const overrides: TLUiOverrides = {
    tools: (editor, tools) => tools,
  };

  return (
    <div className="workspace">
      <TopBar
        name={catalog.name}
        webmcpReady={webmcpReady}
        onExport={async () => {
          const file = await createTldrawCanvasPortSafe(editor);
          if (!file) return;
          const a = document.createElement("a");
          a.href = file.href;
          a.download = `${catalog.name.replace(/\s+/g, "-").toLowerCase()}.png`;
          a.click();
        }}
        onReset={() => {
          localStorage.removeItem("keepers.catalog.v1");
          window.location.reload();
        }}
      />
      <div className="workspace-body">
        <PhotoTray />
        <section className="light-table" aria-label="Shared canvas">
          <Tldraw
            persistenceKey="keepers-canvas"
            components={components}
            overrides={overrides}
            onMount={(next: Editor) => {
              setEditor(next);
              next.user.updateUserPreferences({ colorScheme: "light" });
              const supported = typeof document.modelContext?.registerTool === "function";
              setWebmcpReady(supported);
            }}
          />
        </section>
        <AgentDock spatialIntent={spatialIntent} />
      </div>
      <VariantRail />
      <WebMcpBridge
        commands={commands}
        catalog={catalog}
        spatialIntent={spatialIntent}
      />
      <p className="sr-only">{PRODUCT_NAME}. {PRODUCT_TAGLINE}</p>
    </div>
  );
}

async function createTldrawCanvasPortSafe(editor: Editor | null) {
  if (!editor) return null;
  const { createTldrawCanvasPort } = await import("@/adapters/tldraw/canvas-port");
  return createTldrawCanvasPort(() => editor).exportFrame();
}
