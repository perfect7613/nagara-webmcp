"use client";

import type { ReactNode } from "react";
import { VoiceProvider } from "@/ui/voice-provider";

export function AppShell({ children }: { children: ReactNode }) {
  return <VoiceProvider>{children}</VoiceProvider>;
}
