"use client";

import { useEffect, useMemo } from "react";
import { useWebMCP } from "use-webmcp-tool";
import type { CityState } from "@/domain/types";
import type { VoiceCommands } from "@/modules/voice-command";
import {
  executeTool,
  formatToolResult,
  TOOL_CATALOG,
  toolsForState,
  type ToolDescriptor,
} from "@/modules/webmcp-registry";

export function WebMcpBridge({
  commands,
  state,
}: {
  commands: VoiceCommands;
  state: CityState;
}) {
  const enabled = useMemo(() => new Set(toolsForState().map((tool) => tool.name)), []);

  return (
    <>
      {TOOL_CATALOG.map((tool) => (
        <RegisteredTool
          key={tool.name}
          tool={tool}
          enabled={enabled.has(tool.name)}
          commands={commands}
        />
      ))}
    </>
  );
}

function RegisteredTool({
  tool,
  enabled,
  commands,
}: {
  tool: ToolDescriptor;
  enabled: boolean;
  commands: VoiceCommands;
}) {
  const { supported, registered } = useWebMCP({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
    enabled,
    execute: async (input: Record<string, unknown>) => {
      const result = await executeTool(tool.name, input ?? {}, commands);
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
