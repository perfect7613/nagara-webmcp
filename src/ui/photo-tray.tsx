"use client";

import { DEMO_PHOTOS } from "@/modules/photo-catalog/demo";
import { useWorkspace } from "@/ui/workspace-provider";

export function PhotoTray() {
  const { catalog, commands } = useWorkspace();
  const visible = catalog.assets.filter((asset) => !asset.archivedAt);
  const archived = catalog.assets.filter((asset) => asset.archivedAt);

  return (
    <aside className="tray" aria-label="Photo tray">
      <header>
        <h2>Tray</h2>
        <button
          type="button"
          className="ghost"
          onClick={() =>
            commands.placePhotos({
              assetIds: catalog.selection.assetIds,
              actor: "human",
            })
          }
        >
          Place selected
        </button>
      </header>

      {catalog.groups.map((group) => (
        <section key={group.id} className="group">
          <button
            type="button"
            className={
              catalog.selection.openGroupId === group.id ? "group-head open" : "group-head"
            }
            onClick={() => commands.focusOn({ groupId: group.id })}
          >
            <span className="kicker">{group.type.replace("_", " ")}</span>
            <span className="status">{group.status.replace("_", " ")}</span>
          </button>
          <p className="reason">{group.reason}</p>
          <div className="thumbs">
            {group.assetIds.map((assetId) => {
              const asset = visible.find((item) => item.id === assetId);
              if (!asset) return null;
              const version = catalog.versions.find((item) => item.id === asset.originalVersionId);
              const photo = DEMO_PHOTOS.find((item) => item.demoId === asset.demoId);
              const selected = catalog.selection.assetIds.includes(assetId);
              const recommended = group.recommendation === assetId;
              return (
                <button
                  key={assetId}
                  type="button"
                  className={selected ? "thumb selected" : "thumb"}
                  onClick={(event) => {
                    const next = event.metaKey || event.ctrlKey
                      ? toggle(catalog.selection.assetIds, assetId)
                      : [assetId];
                    commands.setSelection({
                      ...catalog.selection,
                      assetIds: next,
                      openGroupId: group.id,
                    });
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={version?.localSrc} alt={photo?.title ?? assetId} />
                  {recommended ? <span className="rec">agent pick</span> : null}
                </button>
              );
            })}
          </div>
          {catalog.selection.openGroupId === group.id ? (
            <div className="row">
              <button
                type="button"
                className="solid"
                disabled={catalog.selection.assetIds.length !== 1}
                onClick={() =>
                  commands.recordPreference({
                    preferredAssetId: catalog.selection.assetIds[0],
                    groupId: group.id,
                  })
                }
              >
                Keep this one
              </button>
            </div>
          ) : null}
        </section>
      ))}

      <section className="group">
        <h3>Ungrouped</h3>
        <div className="thumbs">
          {visible
            .filter((asset) => !catalog.groups.some((group) => group.assetIds.includes(asset.id)))
            .map((asset) => {
              const version = catalog.versions.find((item) => item.id === asset.originalVersionId);
              return (
                <button
                  key={asset.id}
                  type="button"
                  className={
                    catalog.selection.assetIds.includes(asset.id) ? "thumb selected" : "thumb"
                  }
                  onClick={() =>
                    commands.setSelection({ ...catalog.selection, assetIds: [asset.id] })
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={version?.localSrc} alt="" />
                </button>
              );
            })}
        </div>
      </section>

      {archived.length > 0 ? (
        <section className="group">
          <h3>Archived</h3>
          <button
            type="button"
            className="ghost"
            onClick={() => commands.restorePhotos(archived.map((item) => item.id))}
          >
            Restore all
          </button>
        </section>
      ) : null}
    </aside>
  );
}

function toggle(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}
