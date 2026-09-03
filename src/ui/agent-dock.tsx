"use client";

import {
  Activity,
  Bot,
  CircleAlert,
  LoaderCircle,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import type { SpatialIntent } from "@/modules/spatial-intent";
import { useWorkspace } from "@/ui/workspace-provider";

export function AgentDock({ spatialIntent }: { spatialIntent: SpatialIntent }) {
  const { catalog, commands } = useWorkspace();
  const toolsHint =
    typeof document !== "undefined" &&
    typeof document.modelContext?.registerTool === "function";

  return (
    <aside className="dock float-panel" aria-label="Agent dock">
      <header className="dock-head">
        <div className="tray-title">
          <span className="icon-well">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h2>Agent</h2>
            <p className="muted">
              {toolsHint ? "Site tools live on this page." : "Chrome 149+ or ChatGPT in-app."}
            </p>
          </div>
        </div>
        <IntentCard intent={spatialIntent} />
      </header>

      <section className="dock-panel">
        <h3>
          <Sparkles className="h-4 w-4" aria-hidden />
          Taste
        </h3>
        {catalog.preference.summaryLines.length === 0 ? (
          <p className="empty-line">Keep a frame to teach the agent.</p>
        ) : (
          <ul className="lines">
            {catalog.preference.summaryLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <div className="dock-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => commands.applyPreferences({ actor: "human", minConfidence: 0.7 })}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Apply to similar
          </button>
          {catalog.consent.externalProvider ? (
            <p className="muted consent-ok">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Qwen allowed
            </p>
          ) : (
            <button type="button" className="ghost" onClick={() => commands.grantConsent()}>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Allow image providers
            </button>
          )}
        </div>
      </section>

      <section className="dock-panel">
        <h3>
          <LoaderCircle className="h-4 w-4" aria-hidden />
          Jobs
        </h3>
        {catalog.jobs.length === 0 ? (
          <p className="empty-line">No image jobs yet.</p>
        ) : (
          <ul className="jobs">
            {catalog.jobs.slice(-6).reverse().map((job) => (
              <li key={job.id}>
                <span className={`dot ${job.status}`} />
                <div>
                  <p>{job.instruction || job.operation.replaceAll("_", " ")}</p>
                  <p className="muted">
                    {job.status}
                    {job.labeledDemoFallback ? " · preview" : ""}
                    {job.errorMessage ? ` · ${job.errorMessage}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dock-panel">
        <h3>
          <Activity className="h-4 w-4" aria-hidden />
          Activity
        </h3>
        {catalog.events.length === 0 ? (
          <p className="empty-line">Place, point, then edit.</p>
        ) : (
          <ol className="timeline">
            {catalog.events.slice(-8).reverse().map((event) => (
              <li key={event.id}>
                <span>{event.actor}</span>
                <p>{event.summary}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </aside>
  );
}

function IntentCard({ intent }: { intent: SpatialIntent }) {
  if (intent.kind === "clear") {
    return (
      <p className="intent ok">
        <Target className="h-4 w-4" aria-hidden />
        Aimed at a photo
        {intent.notes.length ? ` · “${intent.notes[0]}”` : ""}
      </p>
    );
  }
  if (intent.kind === "ambiguous") {
    return (
      <p className="intent warn">
        <CircleAlert className="h-4 w-4" aria-hidden />
        {intent.reason}
      </p>
    );
  }
  return (
    <p className="intent muted">
      <MousePointer2 className="h-4 w-4" aria-hidden />
      {intent.reason}
    </p>
  );
}
