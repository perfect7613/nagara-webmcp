"use client";

import { useEffect, useState } from "react";

export function WebMcpStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const read = () => setStatus(document.documentElement.dataset.webmcp ?? "missing");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-webmcp"] });
    return () => observer.disconnect();
  }, []);

  const label =
    status === "ready" ? "WebMCP ready" : status === "supported" ? "WebMCP supported" : "Open in ChatGPT or Chrome with WebMCP";

  return (
    <p className="webmcp-chip" data-status={status}>
      <i /> {label}
    </p>
  );
}
