"use client";

import { memo, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { GitBranch } from "lucide-react";
import type { Version } from "@/domain/types";
import { useWorkspace } from "@/ui/workspace-provider";

type VersionNodeData = Record<string, unknown> & {
  label: string;
  src: string;
  actor: string;
  preview: boolean;
  active: boolean;
};

type VersionNode = Node<VersionNodeData, "version">;

function VersionNodeCard({ data }: NodeProps<VersionNode>) {
  return (
    <div className={data.active ? "dag-node is-active" : "dag-node"}>
      <Handle type="target" position={Position.Left} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {data.src ? <img src={data.src} alt="" /> : <span className="thumb-missing" />}
      <p>
        {data.label}
        {data.preview ? " · preview" : ""}
      </p>
      <span>{data.actor}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  version: memo(VersionNodeCard),
};

function versionLabel(version: Version) {
  if (!version.parentVersionId) return "Original";
  if (version.instruction) return version.instruction;
  return (version.operation ?? "edit").replaceAll("_", " ");
}

function layoutVersions(
  versions: Version[],
  activeVersionId?: string,
): { nodes: VersionNode[]; edges: Edge[] } {
  const byId = new Map(versions.map((item) => [item.id, item]));
  const depthOf = (version: Version) => {
    let depth = 0;
    let current = version;
    const seen = new Set<string>();
    while (
      current.parentVersionId &&
      byId.has(current.parentVersionId) &&
      !seen.has(current.id)
    ) {
      seen.add(current.id);
      current = byId.get(current.parentVersionId)!;
      depth += 1;
    }
    return depth;
  };

  const columns: Version[][] = [];
  for (const version of versions) {
    const depth = depthOf(version);
    (columns[depth] ??= []).push(version);
  }

  const nodes: VersionNode[] = columns.flatMap((column, x) =>
    column.map((version, y) => ({
      id: version.id,
      type: "version" as const,
      position: { x: x * 196 + 16, y: y * 148 + 12 },
      data: {
        label: versionLabel(version),
        src: version.localSrc,
        actor: version.createdBy,
        preview: Boolean(version.labeledDemoFallback),
        active: version.id === activeVersionId,
      },
    })),
  );

  const edges: Edge[] = versions.flatMap((version) =>
    version.parentVersionId && byId.has(version.parentVersionId)
      ? [
          {
            id: `${version.parentVersionId}-${version.id}`,
            source: version.parentVersionId,
            target: version.id,
          },
        ]
      : [],
  );

  return { nodes, edges };
}

export function VariantRail() {
  const { catalog, commands } = useWorkspace();
  const selected =
    catalog.selection.assetIds[0] ??
    catalog.placements.find((item) => !item.ghostJobId)?.assetId;
  const versions = catalog.versions.filter((item) => item.assetId === selected);
  const activeVersionId = catalog.placements.find(
    (item) => item.assetId === selected && !item.ghostJobId,
  )?.activeVersionId;
  const graph = useMemo(
    () => layoutVersions(versions, activeVersionId),
    [versions, activeVersionId],
  );

  return (
    <footer className="rail float-panel" aria-label="Version provenance">
      <div className="rail-label">
        <GitBranch className="h-4 w-4" aria-hidden />
        <div>
          <h2>Version history</h2>
          <p className="muted">
            {versions.length <= 1
              ? "Each edit becomes a node."
              : "Click a node to show it on the table."}
          </p>
        </div>
      </div>
      <div className="rail-flow">
        {versions.length === 0 ? (
          <p className="empty-line">
            Select a photo. After an edit, this graph shows Original → the new version.
          </p>
        ) : versions.length === 1 ? (
          <div className="dag-single">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={versions[0].localSrc} alt="" />
            <div>
              <p>Original</p>
              <p className="muted">
                No edits yet. Point on the photo, type the change, then Edit with Qwen.
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            key={selected}
            nodes={graph.nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            fitView
            colorMode="dark"
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            panOnScroll
            zoomOnScroll
            defaultEdgeOptions={{ type: "smoothstep" }}
            onNodeClick={(_, node) => {
              commands.acceptVariant({ versionId: node.id });
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1}
              color="rgba(244, 234, 214, 0.12)"
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </footer>
  );
}
