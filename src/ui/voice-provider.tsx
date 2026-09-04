"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { CityState } from "@/domain/types";
import { WebMcpBridge } from "@/adapters/webmcp/bridge";
import { createVoiceCommands, emptyCity, loadCity, type VoiceCommands } from "@/modules/voice-command";

const VoiceContext = createContext<{
  state: CityState;
  commands: VoiceCommands;
} | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [store] = useState<{ current: CityState }>(() => ({
    current: typeof window === "undefined" ? emptyCity() : loadCity(),
  }));
  const [state, setState] = useState<CityState>(() => store.current);
  const [commands] = useState(() =>
    createVoiceCommands(
      () => store.current,
      (next) => {
        store.current = next;
        setState(next);
      },
    ),
  );

  return (
    <VoiceContext.Provider value={{ state, commands }}>
      <WebMcpBridge commands={commands} />
      {children}
    </VoiceContext.Provider>
  );
}

export function useCity() {
  const value = useContext(VoiceContext);
  if (!value) throw new Error("useCity must be used inside VoiceProvider");
  return value;
}
