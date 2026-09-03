"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Editor } from "tldraw";
import { createTldrawCanvasPort } from "@/adapters/tldraw/canvas-port";
import { buildDemoCatalog } from "@/modules/photo-catalog/demo";
import { createMemoryCatalogStore } from "@/modules/photo-catalog/store";
import {
  createWorkspaceCommands,
  type ImageJobPort,
  type WorkspaceCommands,
} from "@/modules/workspace-command";
import type { Catalog } from "@/domain/types";

const KEY = "keepers.catalog.v1";

const WorkspaceContext = createContext<{
  catalog: Catalog;
  commands: WorkspaceCommands;
  setEditor: (editor: Editor | null) => void;
  editor: Editor | null;
} | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const editorRef = useRef<Editor | null>(null);
  const [editor, setEditorState] = useState<Editor | null>(null);
  const store = useMemo(() => {
    const initial = loadCatalog();
    return createMemoryCatalogStore(initial);
  }, []);

  const jobPort = useMemo<ImageJobPort>(
    () => ({
      async start(input) {
        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sourceUrl: input.sourceUrl,
            instruction: input.instruction,
            maskPng: input.maskPng,
            allowDemoFallback: process.env.NEXT_PUBLIC_ALLOW_DEMO_FALLBACK === "1",
          }),
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Image job failed.");
        return {
          outputSrc: json.outputSrc as string,
          width: json.width ?? 1200,
          height: json.height ?? 800,
          provider: json.provider as string,
          model: json.model as string | undefined,
          labeledDemoFallback: json.labeledDemoFallback as boolean | undefined,
        };
      },
    }),
    [],
  );

  const commands = useMemo(() => {
    const canvas = createTldrawCanvasPort(() => editorRef.current);
    return createWorkspaceCommands(store, canvas, jobPort);
  }, [store, jobPort]);

  const catalog = useSyncExternalStore(
    store.subscribe,
    store.get,
    store.get,
  );

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(catalog));
    } catch {
      /* quota */
    }
  }, [catalog]);

  const value = useMemo(
    () => ({
      catalog,
      commands,
      editor,
      setEditor: (next: Editor | null) => {
        editorRef.current = next;
        setEditorState(next);
      },
    }),
    [catalog, commands, editor],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}

function loadCatalog(): Catalog {
  if (typeof window === "undefined") return buildDemoCatalog();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Catalog;
  } catch {
    /* ignore */
  }
  return buildDemoCatalog();
}
