"use client";

import type { SpatialIntent } from "@/modules/spatial-intent";
import { useWorkspace } from "@/ui/workspace-provider";

export function AgentDock({ spatialIntent }: { spatialIntent: SpatialIntent }) {
  const { catalog, commands } = useWorkspace();
  const toolsHint =
    typeof document !== "undefined" &&
    typeof document.modelContext?.registerTool === "function";

  return (
    <aside className="dock" aria-label="Agent dock">
      <header>
        <h2>Agent dock</h2>
        <p>{toolsHint ? "Site tools are registered on this page." : "Open in Chrome 149+ with WebMCP, or ChatGPT’s in-app browser."}</p>
      </header>

      <section>
        <h3>Taste</h3>
        <ul className="lines">
          {catalog.preference.summaryLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <button
          type="button"
          className="ghost"
          onClick={() => commands.applyPreferences({ actor: "human", minConfidence: 0.7 })}
        >
          Apply to similar groups
        </button>
        {catalog.consent.externalProvider ? (
          <p className="muted">External provider consent is on.</p>
        ) : (
          <button type="button" className="ghost" onClick={() => commands.grantConsent()}>
            Allow external image providers
          </button>
        )}
      </section>

      <section>
        <h3>Spatial intent</h3>
        <IntentCard intent={spatialIntent} />
        {spatialIntent.kind === "clear" ? (
          <button
            type="button"
            className="solid"
            onClick={() =>
              commands.startImageJob({
                actor: "human",
                instruction: spatialIntent.notes[0] ?? "Remove the marked object and keep the rest natural.",
                versionId: spatialIntent.target.versionId,
                placementId: spatialIntent.target.placementId,
              })
            }
          >
            Edit from pointing
          </button>
        ) : null}
      </section>

      <section>
        <h3>Jobs</h3>
        {catalog.jobs.length === 0 ? <p className="muted">No image jobs yet.</p> : null}
        <ul className="jobs">
          {catalog.jobs.slice(-6).reverse().map((job) => (
            <li key={job.id}>
              <span className={`dot ${job.status}`} />
              <div>
                <p>{job.operation}</p>
                <p className="muted">
                  {job.status}
                  {job.labeledDemoFallback ? " · labeled local preview" : ""}
                  {job.errorMessage ? ` · ${job.errorMessage}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Activity</h3>
        <ol className="timeline">
          {catalog.events.slice(-8).reverse().map((event) => (
            <li key={event.id}>
              <span>{event.actor}</span>
              <p>{event.summary}</p>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}

function IntentCard({ intent }: { intent: SpatialIntent }) {
  if (intent.kind === "clear") {
    return (
      <p className="intent ok">
        Clear target: {intent.target.assetId || intent.target.placementId}
        {intent.region ? ` · region ${intent.region.w}×${intent.region.h}` : ""}
        {intent.notes.length ? ` · “${intent.notes[0]}”` : ""}
      </p>
    );
  }
  if (intent.kind === "ambiguous") {
    return <p className="intent warn">{intent.reason}</p>;
  }
  return <p className="intent muted">{intent.reason}</p>;
}
