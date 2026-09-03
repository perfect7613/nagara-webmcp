"use client";
"use no memo";

import { memo, useEffect, useMemo, useRef } from "react";
import { Quickdraw, type Editor, type Snapshot } from "@quickdrawjs/react";

export const BOARD_SNAPSHOT_KEY = "keepers.quickdraw.v1";

function loadSnapshot(): Snapshot | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(BOARD_SNAPSHOT_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as Snapshot;
  } catch {
    return undefined;
  }
}

function persistSnapshot(editor: Editor) {
  try {
    localStorage.setItem(BOARD_SNAPSHOT_KEY, JSON.stringify(editor.store.getSnapshot()));
  } catch {
    /* quota */
  }
}

function KeepersBoardInner({
  onEditor,
}: {
  onEditor: (editor: Editor | null) => void;
}) {
  const snapshot = useMemo(() => loadSnapshot(), []);
  const onEditorRef = useRef(onEditor);
  const persistTimer = useRef<number>(0);
  onEditorRef.current = onEditor;

  useEffect(() => {
    return () => {
      window.clearTimeout(persistTimer.current);
      onEditorRef.current(null);
    };
  }, []);

  return (
    <Quickdraw
      className="keepers-board"
      theme="light"
      grid="dots"
      watermark={false}
      snapshot={snapshot}
      onMount={(editor) => onEditorRef.current(editor)}
      onChange={(_diff, source, editor) => {
        if (source !== "user") return;
        window.clearTimeout(persistTimer.current);
        persistTimer.current = window.setTimeout(() => persistSnapshot(editor), 280);
      }}
    />
  );
}

export const KeepersBoard = memo(KeepersBoardInner);
