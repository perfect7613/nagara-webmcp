"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { CityState } from "@/domain/types";
import { WebMcpBridge } from "@/adapters/webmcp/bridge";
import { createVoiceCommands, emptyCity, loadCity, type VoiceCommands } from "@/modules/voice-command";

const VoiceContext = createContext<{
  state: CityState;
  commands: VoiceCommands;
} | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CityState>(() =>
    typeof window === "undefined" ? emptyCity() : loadCity(),
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const commands = useMemo(
    () =>
      createVoiceCommands(
        () => stateRef.current,
        (next) => {
          stateRef.current = next;
          setState(next);
        },
      ),
    [],
  );

  return (
    <VoiceContext.Provider value={{ state, commands }}>
      <WebMcpBridge commands={commands} state={state} />
      {children}
    </VoiceContext.Provider>
  );
}

export function useCity() {
  const value = useContext(VoiceContext);
  if (!value) throw new Error("useCity must be used inside VoiceProvider");
  return value;
}
