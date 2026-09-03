"use client";
"use no memo";

import { useEffect, useMemo, useState } from "react";
import type { Editor } from "tldraw";
import { readCanvasView } from "@/adapters/tldraw/canvas-port";

export function useCanvasView(editor: Editor | null) {
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setEpoch((value) => value + 1);
    const unlistenDocument = editor.store.listen(bump, {
      source: "user",
      scope: "document",
    });
    const unlistenSession = editor.store.listen(bump, {
      source: "user",
      scope: "session",
    });
    const afterReady = window.setTimeout(bump, 320);
    return () => {
      unlistenDocument();
      unlistenSession();
      window.clearTimeout(afterReady);
    };
  }, [editor]);

  return useMemo(() => readCanvasView(editor), [editor, epoch]);
}
