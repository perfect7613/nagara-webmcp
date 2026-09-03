"use client";

import { useEffect, useMemo, useState } from "react";
import type { Editor } from "tldraw";
import { readCanvasView } from "@/adapters/tldraw/canvas-port";

export function useCanvasView(editor: Editor | null) {
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setEpoch((value) => value + 1);
    bump();
    const unlisten = editor.store.listen(bump, { source: "all", scope: "all" });
    const persist = window.setTimeout(bump, 50);
    return () => {
      unlisten();
      window.clearTimeout(persist);
    };
  }, [editor]);

  return useMemo(() => readCanvasView(editor), [editor, epoch]);
}
