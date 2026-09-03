"use client";

import { useEffect, useState } from "react";
import { WorkspaceProvider } from "@/ui/workspace-provider";
import { WorkspaceShell } from "@/ui/workspace-shell";

export default function WorkspaceApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="boot">
        <p>Opening the light table…</p>
      </div>
    );
  }
  return (
    <WorkspaceProvider>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
