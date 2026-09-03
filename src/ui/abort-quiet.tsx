"use client";

import { useEffect } from "react";

export function AbortQuiet() {
  useEffect(() => {
    const onReject = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const name =
        reason && typeof reason === "object" && "name" in reason
          ? String(reason.name)
          : "";
      if (name === "AbortError") event.preventDefault();
    };
    window.addEventListener("unhandledrejection", onReject);
    return () => window.removeEventListener("unhandledrejection", onReject);
  }, []);
  return null;
}
