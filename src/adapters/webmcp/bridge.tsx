"use client";

import { useEffect, useMemo } from "react";
import { useWebMCP } from "use-webmcp-tool";
import type { Catalog } from "@/domain/types";
import {
  maskToPngDataUrl,
  type CanvasView,
  type SpatialIntent,
} from "@/modules/spatial-intent";
import {
  executeTool,
  formatToolResult,
  TOOL_CATALOG,
  toolsForState,
  type ToolDescriptor,
} from "@/modules/webmcp-registry";
import type { WorkspaceCommands } from "@/modules/workspace-command";

export function WebMcpBridge({
  commands,
  catalog,
  spatialIntent,
  canvasView,
}: {
  commands: WorkspaceCommands;
  catalog: Catalog;
  spatialIntent: SpatialIntent;
  canvasView: CanvasView;
}) {
  const enabled = useMemo(
    () => new Set(toolsForState(commands.getSnapshot()).map((tool) => tool.name)),
    [catalog.updatedAt, catalog.selection, catalog.consent, catalog.placements.length],
  );

  return (
    <>
      {TOOL_CATALOG.map((tool) => (
        <RegisteredTool
          key={tool.name}
          tool={tool}
          enabled={enabled.has(tool.name)}
          commands={commands}
          catalog={catalog}
          spatialIntent={spatialIntent}
          canvasView={canvasView}
        />
      ))}
    </>
  );
}

function RegisteredTool({
  tool,
  enabled,
  commands,
  catalog,
  spatialIntent,
  canvasView,
}: {
  tool: ToolDescriptor;
  enabled: boolean;
  commands: WorkspaceCommands;
  catalog: Catalog;
  spatialIntent: SpatialIntent;
  canvasView: CanvasView;
}) {
  const maskPng = useMemo(() => {
    if (spatialIntent.kind !== "clear" || !spatialIntent.mask) return undefined;
    return maskToPngDataUrl(spatialIntent.mask);
  }, [spatialIntent]);

  const { supported, registered } = useWebMCP({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
    enabled,
    execute: async (input: Record<string, unknown>) => {
      const result = await executeTool(tool.name, input ?? {}, {
        commands,
        catalog,
        spatialIntent,
        canvasView,
        maskPng,
      });
      return formatToolResult(result);
    },
  });

  useEffect(() => {
    document.documentElement.dataset.webmcp = supported
      ? registered
        ? "ready"
        : "supported"
      : "missing";
  }, [supported, registered]);

  return null;
}
