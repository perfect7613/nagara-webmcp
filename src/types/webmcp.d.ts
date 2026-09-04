export {};

declare global {
  interface ModelContextTool {
    name: string;
    title?: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    annotations?: Record<string, unknown>;
    execute: (input: Record<string, unknown>, extra?: { signal?: AbortSignal }) => unknown;
  }

  interface ModelContext {
    registerTool(
      tool: ModelContextTool,
      options?: { signal?: AbortSignal; exposedTo?: string[] },
    ): Promise<void> | void;
    getTools?: () => Promise<unknown[]>;
    executeTool?: (tool: unknown, input: string) => Promise<unknown>;
    addEventListener?: (type: string, listener: EventListener) => void;
  }

  interface Document {
    modelContext?: ModelContext;
  }
}
