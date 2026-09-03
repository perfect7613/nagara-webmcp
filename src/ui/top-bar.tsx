"use client";

import Link from "next/link";
import {
  Download,
  PanelLeft,
  PanelRight,
  Radio,
  Trash2,
} from "lucide-react";
import { PRODUCT_NAME } from "@/domain/product";
import { useSidebar } from "@/components/ui/sidebar";

export function TopBar({
  name,
  webmcpReady,
  dockOpen,
  onToggleDock,
  onExport,
  onClear,
}: {
  name: string;
  webmcpReady: boolean;
  dockOpen: boolean;
  onToggleDock: () => void;
  onExport: () => void;
  onClear: () => void;
}) {
  const { open, setOpen } = useSidebar();

  return (
    <header className="topbar">
      <div className="chrome-island">
        <button
          type="button"
          className={open ? "ghost icon-btn is-on" : "ghost icon-btn"}
          aria-label={open ? "Hide tray" : "Show tray"}
          aria-pressed={open}
          onClick={() => setOpen((value) => !value)}
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <Link href="/" className="brand">
          <span className="mark">K</span>
          <div>
            <p className="product">{PRODUCT_NAME}</p>
            <p className="project">{name}</p>
          </div>
        </Link>
      </div>
      <div className="chrome-island">
        <span className={webmcpReady ? "pill live" : "pill"}>
          <Radio className="h-3.5 w-3.5" aria-hidden />
          {webmcpReady ? "WebMCP live" : "WebMCP off"}
        </span>
        <button type="button" className="ghost" onClick={onClear}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Clear
        </button>
        <button type="button" className="solid" onClick={onExport}>
          <Download className="h-3.5 w-3.5" aria-hidden />
          Export
        </button>
        <button
          type="button"
          className={dockOpen ? "ghost icon-btn is-on" : "ghost icon-btn"}
          aria-label={dockOpen ? "Hide agent" : "Show agent"}
          aria-pressed={dockOpen}
          onClick={onToggleDock}
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
