"use client";

import type { MouseEvent, ReactNode } from "react";
import {
  Archive,
  Check,
  Copy,
  Images,
  Layers2,
  LayoutGrid,
  Pin,
  Sparkles,
  SwatchBook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { DEMO_PHOTOS } from "@/modules/photo-catalog/demo";
import type { Asset, GroupStatus, GroupType, Version } from "@/domain/types";
import { PhotoIngest } from "@/ui/photo-ingest";
import { useWorkspace } from "@/ui/workspace-provider";

const GROUP_ICON: Record<GroupType, ReactNode> = {
  burst: <Layers2 className="h-4 w-4" />,
  duplicate: <Copy className="h-4 w-4" />,
  near_duplicate: <Images className="h-4 w-4" />,
  similar: <SwatchBook className="h-4 w-4" />,
};

function statusLabel(status: GroupStatus) {
  return status.replaceAll("_", " ");
}

function typeLabel(type: GroupType) {
  return type.replaceAll("_", " ");
}

export function PhotoTray() {
  const { catalog, commands } = useWorkspace();
  const { open } = useSidebar();
  const visible = catalog.assets.filter((asset) => !asset.archivedAt);
  const archived = catalog.assets.filter((asset) => asset.archivedAt);
  const ungrouped = visible.filter(
    (asset) => !catalog.groups.some((group) => group.assetIds.includes(asset.id)),
  );

  return (
    <aside
      className={cn("tray-shell keepers-tray float-panel", open ? "is-open" : "is-collapsed")}
      aria-label="Photo tray"
    >
        <header className="tray-head">
          <div className="tray-title">
            <span className="icon-well">
              <LayoutGrid className="h-4 w-4" />
            </span>
            {open ? (
              <div>
                <h2>Tray</h2>
                <p className="muted">
                  {visible.length} frames · {catalog.groups.length} groups
                </p>
              </div>
            ) : null}
          </div>
          {open ? (
            <button
              type="button"
              className="ghost"
              disabled={catalog.selection.assetIds.length === 0}
              onClick={() =>
                commands.placePhotos({
                  assetIds: catalog.selection.assetIds,
                  actor: "human",
                })
              }
            >
              <Pin className="h-3.5 w-3.5" aria-hidden />
              Place selected
            </button>
          ) : (
            <button
              type="button"
              className="ghost icon-btn"
              aria-label="Place selected"
              disabled={catalog.selection.assetIds.length === 0}
              onClick={() =>
                commands.placePhotos({
                  assetIds: catalog.selection.assetIds,
                  actor: "human",
                })
              }
            >
              <Pin className="h-4 w-4" />
            </button>
          )}
          {open ? <PhotoIngest /> : null}
        </header>

        <div className="tray-scroll">
          {open && visible.length === 0 ? (
            <div className="tray-empty">
              <p>No photos yet.</p>
              <p className="muted">
                Drop files above. They upload to UploadThing and land here — nothing is preloaded.
              </p>
            </div>
          ) : null}

          {catalog.groups.map((group) => (
            <section key={group.id} className="group-card">
              <button
                type="button"
                className={
                  catalog.selection.openGroupId === group.id
                    ? "group-head open"
                    : "group-head"
                }
                onClick={() => commands.focusOn({ groupId: group.id })}
              >
                <span className="group-label">
                  {GROUP_ICON[group.type]}
                  {open ? <span className="kicker">{typeLabel(group.type)}</span> : null}
                </span>
                {open ? (
                  <span className={`status status-${group.status}`}>
                    {group.status === "needs_taste" ? (
                      <Sparkles className="h-3 w-3" aria-hidden />
                    ) : null}
                    {statusLabel(group.status)}
                  </span>
                ) : null}
              </button>
              {open ? <p className="reason">{group.reason}</p> : null}
              {open ? (
                <div className="thumbs">
                  {group.assetIds.map((assetId) => {
                    const asset = visible.find((item) => item.id === assetId);
                    if (!asset) return null;
                    const version = catalog.versions.find(
                      (item) => item.id === asset.originalVersionId,
                    );
                    return (
                      <FrameThumb
                        key={assetId}
                        asset={asset}
                        version={version}
                        selected={catalog.selection.assetIds.includes(assetId)}
                        recommended={group.recommendation === assetId}
                        onClick={(event) => {
                          const next =
                            event.metaKey || event.ctrlKey
                              ? toggle(catalog.selection.assetIds, assetId)
                              : [assetId];
                          commands.setSelection({
                            ...catalog.selection,
                            assetIds: next,
                            openGroupId: group.id,
                          });
                        }}
                      />
                    );
                  })}
                </div>
              ) : null}
              {open && catalog.selection.openGroupId === group.id ? (
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
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Keep this one
                  </button>
                </div>
              ) : null}
            </section>
          ))}

          {open && ungrouped.length > 0 ? (
            <section className="group-card">
              <h3>
                <Images className="h-4 w-4" aria-hidden />
                Ungrouped
              </h3>
              <div className="thumbs">
                {ungrouped.map((asset) => {
                  const version = catalog.versions.find(
                    (item) => item.id === asset.originalVersionId,
                  );
                  return (
                    <FrameThumb
                      key={asset.id}
                      asset={asset}
                      version={version}
                      selected={catalog.selection.assetIds.includes(asset.id)}
                      onClick={() =>
                        commands.setSelection({
                          ...catalog.selection,
                          assetIds: [asset.id],
                        })
                      }
                    />
                  );
                })}
              </div>
            </section>
          ) : null}

          {archived.length > 0 ? (
            <section className="group-card">
              {open ? <h3>
                <Archive className="h-4 w-4" aria-hidden />
                Archived
              </h3> : null}
              <button
                type="button"
                className={open ? "ghost" : "ghost icon-btn"}
                aria-label="Restore archived photos"
                onClick={() => commands.restorePhotos(archived.map((item) => item.id))}
              >
                <Archive className="h-3.5 w-3.5" aria-hidden />
                {open ? "Restore all" : null}
              </button>
            </section>
          ) : null}
        </div>
    </aside>
  );
}

function FrameThumb({
  asset,
  version,
  selected,
  recommended,
  onClick,
}: {
  asset: Asset;
  version?: Version;
  selected: boolean;
  recommended?: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const title = frameTitle(asset, version);
  const src =
    version?.localSrc ||
    DEMO_PHOTOS.find((item) => item.demoId === asset.demoId)?.src ||
    "";

  return (
    <button
      type="button"
      className={selected ? "thumb selected" : "thumb"}
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={title} /> : <span className="thumb-missing" />}
      <span className="thumb-cap">{title}</span>
      {recommended ? (
        <span className="rec">
          <Sparkles className="h-3 w-3" aria-hidden />
          pick
        </span>
      ) : null}
    </button>
  );
}

function frameTitle(asset: Asset, version?: Version) {
  const photo = DEMO_PHOTOS.find((item) => item.demoId === asset.demoId);
  if (photo?.title) return photo.title;
  const filename = version?.parameters?.filename;
  if (typeof filename === "string" && filename) {
    return filename.replace(/\.[^.]+$/, "");
  }
  return "Photo";
}

function toggle(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}
