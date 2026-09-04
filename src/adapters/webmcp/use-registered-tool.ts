"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import type { ToolDescriptor } from "@/modules/webmcp-registry";

type ToolResult = {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
};

export function useRegisteredWebMcpTool({
  tool,
  enabled,
  execute,
}: {
  tool: ToolDescriptor;
  enabled: boolean;
  execute: (input: Record<string, unknown>) => Promise<ToolResult>;
}) {
  const executeRef = useRef(execute);
  const [registered, setRegistered] = useState(false);
  const [detectTick, redetect] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    executeRef.current = execute;
  }, [execute]);

  useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext) {
      let attempts = 0;
      const timer = window.setInterval(() => {
        if (document.modelContext) {
          window.clearInterval(timer);
          redetect();
        } else if (++attempts >= 20) {
          window.clearInterval(timer);
        }
      }, 500);
      return () => window.clearInterval(timer);
    }

    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    let active = true;
    const registration = modelContext.registerTool(
      {
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
        execute: (input) => executeRef.current(input ?? {}),
      },
      { signal: controller.signal },
    );

    Promise.resolve(registration)
      .then(() => {
        if (active) setRegistered(true);
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted || isAbortError(error)) return;
        console.error(`WebMCP registration failed for ${tool.name}`, error);
        setRegistered(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [detectTick, enabled, tool.annotations, tool.description, tool.inputSchema, tool.name, tool.title]);

  return {
    supported: typeof document !== "undefined" && Boolean(document.modelContext),
    registered,
  };
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
