"use client";
"use no memo";

import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@quickdrawjs/core";
import { readCanvasView } from "@/adapters/quickdraw/canvas-port";

export function useCanvasView(editor: Editor | null) {
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setEpoch((value) => value + 1);
    const unlistenStore = editor.store.listen(bump, { source: "user" });
    const unlistenHistory = editor.store.listenHistory(bump);
    const unlistenSelection = editor.on("selection", bump);
    return () => {
      unlistenStore();
      unlistenHistory();
      unlistenSelection();
    };
  }, [editor]);

  return useMemo(() => readCanvasView(editor), [editor, epoch]);
}
