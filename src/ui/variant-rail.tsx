"use client";

import { useWorkspace } from "@/ui/workspace-provider";

export function VariantRail() {
  const { catalog, commands } = useWorkspace();
  const selected = catalog.selection.assetIds[0];
  const versions = catalog.versions.filter((item) => item.assetId === selected);

  return (
    <footer className="rail" aria-label="Versions">
      <h2>Versions</h2>
      {versions.length === 0 ? (
        <p className="muted">Select a photo to inspect its version DAG and provenance.</p>
      ) : (
        <ul>
          {versions.map((version) => (
            <li key={version.id}>
              <button
                type="button"
                onClick={() => {
                  const placement = catalog.placements.find(
                    (item) => item.assetId === version.assetId && item.ghostJobId,
                  );
                  commands.acceptVariant({
                    versionId: version.id,
                    placementId: placement?.id,
                  });
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={version.localSrc} alt="" />
                <span>
                  {version.operation ?? "original"}
                  {version.labeledDemoFallback ? " · preview" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </footer>
  );
}
