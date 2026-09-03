"use client";

import { PRODUCT_NAME } from "@/domain/product";

export function TopBar({
  name,
  webmcpReady,
  onExport,
  onReset,
}: {
  name: string;
  webmcpReady: boolean;
  onExport: () => void;
  onReset: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark">K</span>
        <div>
          <p className="product">{PRODUCT_NAME}</p>
          <p className="project">{name}</p>
        </div>
      </div>
      <p className="verbs">Choose · Point · Create</p>
      <div className="top-actions">
        <span className={webmcpReady ? "pill live" : "pill"}>
          {webmcpReady ? "WebMCP live" : "WebMCP unavailable in this browser"}
        </span>
        <button type="button" className="ghost" onClick={onReset}>
          Reload demo
        </button>
        <button type="button" className="solid" onClick={onExport}>
          Export
        </button>
      </div>
    </header>
  );
}
