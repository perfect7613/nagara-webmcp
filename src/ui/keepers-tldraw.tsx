"use client";
"use no memo";

import {
  Component,
  memo,
  useCallback,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { Tldraw, type Editor, type TLComponents, type TLUiOverrides } from "tldraw";

const TLDRAW_COMPONENTS: TLComponents = {
  SharePanel: null,
  HelpMenu: null,
  Minimap: null,
  StylePanel: null,
  NavigationPanel: null,
  DebugPanel: null,
  DebugMenu: null,
  CursorChatBubble: null,
  FollowingIndicator: null,
  PeopleMenu: null,
  UserPresenceEditor: null,
};

const TLDRAW_OVERRIDES: TLUiOverrides = {
  tools: (_editor, tools) => tools,
};

const BOARD_KEY = "keepers-canvas-v1";

class CanvasErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("tldraw canvas failed; remounting without persistence.", error, info);
    this.props.onError();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function KeepersTldrawInner({
  onEditor,
}: {
  onEditor: (editor: Editor | null) => void;
}) {
  const onEditorRef = useRef(onEditor);
  onEditorRef.current = onEditor;
  const [persist, setPersist] = useState(true);
  const [generation, setGeneration] = useState(0);

  const handleReady = useCallback((editor: Editor) => {
    onEditorRef.current(editor);
    editor.user.updateUserPreferences({ colorScheme: "light" });
  }, []);

  const recover = useCallback(() => {
    onEditorRef.current(null);
    setPersist(false);
    setGeneration((value) => value + 1);
  }, []);

  return (
    <CanvasErrorBoundary key={generation} onError={recover}>
      <Tldraw
        persistenceKey={persist ? BOARD_KEY : undefined}
        autoFocus={false}
        components={TLDRAW_COMPONENTS}
        overrides={TLDRAW_OVERRIDES}
        onMount={handleReady}
      />
    </CanvasErrorBoundary>
  );
}

export const KeepersTldraw = memo(KeepersTldrawInner);
