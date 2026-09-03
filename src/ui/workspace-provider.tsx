"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Editor } from "@quickdrawjs/core";
import { createCanvasPort } from "@/adapters/quickdraw/canvas-port";
import { buildDemoCatalog, emptyCatalog } from "@/modules/photo-catalog/demo";
import { createMemoryCatalogStore } from "@/modules/photo-catalog/store";
import {
  createWorkspaceCommands,
  type ImageJobPort,
  type WorkspaceCommands,
} from "@/modules/workspace-command";
import type { Catalog } from "@/domain/types";

export const CATALOG_KEY = "keepers.catalog.v3";

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
        const sourceUrl = await asJobSource(input.sourceUrl);
        const response = await fetch("/api/jobs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sourceUrl,
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
    const canvas = createCanvasPort(() => editorRef.current);
    return createWorkspaceCommands(store, canvas, jobPort);
  }, [store, jobPort]);

  const catalog = useSyncExternalStore(
    store.subscribe,
    store.get,
    store.get,
  );

  useEffect(() => {
    try {
      localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
    } catch {
      /* quota */
    }
  }, [catalog]);

  const setEditor = useCallback((next: Editor | null) => {
    editorRef.current = next;
    setEditorState(next);
  }, []);

  const value = useMemo(
    () => ({
      catalog,
      commands,
      editor,
      setEditor,
    }),
    [catalog, commands, editor, setEditor],
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
  if (typeof window === "undefined") return emptyCatalog();
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) return JSON.parse(raw) as Catalog;
  } catch {
    /* ignore */
  }
  return emptyCatalog();
}

export function loadDemoCatalog() {
  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify(buildDemoCatalog()));
  } catch {
    /* quota */
  }
  window.location.reload();
}

export function clearWorkspaceCatalog() {
  try {
    localStorage.removeItem(CATALOG_KEY);
    localStorage.removeItem("keepers.catalog.v2");
    localStorage.removeItem("keepers.quickdraw.v1");
  } catch {
    /* ignore */
  }
  window.location.reload();
}

async function asJobSource(url: string) {
  if (url.startsWith("data:")) return url;
  if (url.startsWith("blob:") || url.startsWith("/")) {
    const response = await fetch(url);
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  }
  return url;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
