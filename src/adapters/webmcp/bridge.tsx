"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRegisteredWebMcpTool } from "@/adapters/webmcp/use-registered-tool";
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
}: {
  commands: VoiceCommands;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const enabled = useMemo(() => new Set(toolsForState().map((tool) => tool.name)), []);
  const environment = useMemo(
    () => ({
      pathname,
      navigate: (href: string) => router.push(href),
      locate: () =>
        new Promise<{ lng: number; lat: number }>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("This browser does not provide geolocation."));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({ lng: position.coords.longitude, lat: position.coords.latitude }),
            (error) => reject(new Error(error.message || "Location permission was not granted.")),
            { enableHighAccuracy: true, timeout: 10000 },
          );
        }),
    }),
    [pathname, router],
  );

  return (
    <>
      {TOOL_CATALOG.map((tool) => (
        <RegisteredTool
          key={tool.name}
          tool={tool}
          enabled={enabled.has(tool.name)}
          commands={commands}
          environment={environment}
        />
      ))}
    </>
  );
}

function RegisteredTool({
  tool,
  enabled,
  commands,
  environment,
}: {
  tool: ToolDescriptor;
  enabled: boolean;
  commands: VoiceCommands;
  environment: Parameters<typeof executeTool>[3];
}) {
  const { supported, registered } = useRegisteredWebMcpTool({
    tool,
    enabled,
    execute: async (input: Record<string, unknown>) => {
      const result = await executeTool(tool.name, input ?? {}, commands, environment);
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
