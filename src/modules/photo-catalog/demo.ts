import { createId } from "@/domain/ids";
import type {
  Asset,
  Catalog,
  PhotoAnalysis,
  PhotoGroup,
  QualitySignals,
  Version,
} from "@/domain/types";
import { emptyPreference } from "@/modules/preference-profile";

export interface DemoPhoto {
  demoId: string;
  title: string;
  scene: string;
  group: "burst" | "near_duplicate" | "similar" | "single";
  src: string;
  width: number;
  height: number;
  quality: QualitySignals;
  capturedAt: number;
  note: string;
}

const t0 = Date.parse("2026-07-12T16:40:00Z");

export const DEMO_PHOTOS: DemoPhoto[] = [
  {
    demoId: "dock-jump-sharp",
    title: "Dock jump — peak sharpness",
    scene: "dock-jump",
    group: "burst",
    src: "/demo/dock-jump-sharp.svg",
    width: 1200,
    height: 800,
    quality: {
      sharpness: 0.94,
      expression: 0.42,
      composition: 0.55,
      brightness: 0.62,
      faceVisibility: 0.7,
    },
    capturedAt: t0,
    note: "Technically sharp, expression closed.",
  },
  {
    demoId: "dock-jump-expressive",
    title: "Dock jump — open laugh",
    scene: "dock-jump",
    group: "burst",
    src: "/demo/dock-jump-expressive.svg",
    width: 1200,
    height: 800,
    quality: {
      sharpness: 0.71,
      expression: 0.96,
      composition: 0.68,
      brightness: 0.6,
      faceVisibility: 0.88,
    },
    capturedAt: t0 + 180,
    note: "Slightly softer, unmistakable laugh.",
  },
  {
    demoId: "dock-jump-mid",
    title: "Dock jump — mid-air",
    scene: "dock-jump",
    group: "burst",
    src: "/demo/dock-jump-mid.svg",
    width: 1200,
    height: 800,
    quality: {
      sharpness: 0.8,
      expression: 0.58,
      composition: 0.5,
      brightness: 0.59,
      faceVisibility: 0.65,
    },
    capturedAt: t0 + 90,
    note: "Neither the sharpest nor the most alive.",
  },
  {
    demoId: "porch-a",
    title: "Porch table — left crop",
    scene: "porch",
    group: "near_duplicate",
    src: "/demo/porch-a.svg",
    width: 1200,
    height: 900,
    quality: {
      sharpness: 0.78,
      expression: 0.2,
      composition: 0.48,
      brightness: 0.7,
      faceVisibility: 0.1,
    },
    capturedAt: t0 + 3600,
    note: "Near duplicate, tighter crop.",
  },
  {
    demoId: "porch-b",
    title: "Porch table — wider",
    scene: "porch",
    group: "near_duplicate",
    src: "/demo/porch-b.svg",
    width: 1200,
    height: 900,
    quality: {
      sharpness: 0.81,
      expression: 0.2,
      composition: 0.74,
      brightness: 0.66,
      faceVisibility: 0.1,
    },
    capturedAt: t0 + 3680,
    note: "Near duplicate with more breathing room.",
  },
  {
    demoId: "lake-object",
    title: "Lakeside — stray cooler",
    scene: "lake",
    group: "single",
    src: "/demo/lake-object.svg",
    width: 1400,
    height: 900,
    quality: {
      sharpness: 0.86,
      expression: 0.15,
      composition: 0.6,
      brightness: 0.72,
      faceVisibility: 0.05,
    },
    capturedAt: t0 + 7200,
    note: "Clear unwanted object for pointing / inpaint.",
  },
  {
    demoId: "market-warm",
    title: "Market stall — warm",
    scene: "postcard",
    group: "similar",
    src: "/demo/market-warm.svg",
    width: 1000,
    height: 1300,
    quality: {
      sharpness: 0.77,
      expression: 0.4,
      composition: 0.8,
      brightness: 0.58,
      faceVisibility: 0.3,
    },
    capturedAt: t0 + 10800,
    note: "Postcard candidate.",
  },
  {
    demoId: "market-cool",
    title: "Market stall — cool",
    scene: "postcard",
    group: "similar",
    src: "/demo/market-cool.svg",
    width: 1000,
    height: 1300,
    quality: {
      sharpness: 0.83,
      expression: 0.35,
      composition: 0.76,
      brightness: 0.5,
      faceVisibility: 0.28,
    },
    capturedAt: t0 + 10840,
    note: "Same stall, cooler grade.",
  },
];

export function buildDemoCatalog(workspaceId = "ws_demo"): Catalog {
  const assets: Asset[] = [];
  const versions: Version[] = [];
  const analyses: PhotoAnalysis[] = [];
  const now = Date.now();

  for (const photo of DEMO_PHOTOS) {
    const assetId = `asset_${photo.demoId}`;
    const versionId = `ver_${photo.demoId}`;
    assets.push({
      id: assetId,
      workspaceId,
      kind: "photo",
      originalVersionId: versionId,
      createdAt: now,
      demoId: photo.demoId,
    });
    versions.push({
      id: versionId,
      assetId,
      localSrc: photo.src,
      width: photo.width,
      height: photo.height,
      mimeType: "image/svg+xml",
      createdBy: "system",
      operation: "ingest",
      createdAt: now,
    });
    analyses.push({
      versionId,
      qualitySignals: photo.quality,
      capturedAt: photo.capturedAt,
      analyzedAt: now,
      scene: photo.scene,
      perceptualHash: photo.scene,
    });
  }

  const groups: PhotoGroup[] = [
    {
      id: "grp_dock-jump",
      workspaceId,
      type: "burst",
      assetIds: [
        "asset_dock-jump-sharp",
        "asset_dock-jump-expressive",
        "asset_dock-jump-mid",
      ],
      recommendation: "asset_dock-jump-sharp",
      confidence: 0.58,
      status: "needs_taste",
      reason: "Burst of three. Sharpest frame is not obviously the keeper.",
    },
    {
      id: "grp_porch",
      workspaceId,
      type: "near_duplicate",
      assetIds: ["asset_porch-a", "asset_porch-b"],
      recommendation: "asset_porch-b",
      confidence: 0.64,
      status: "unreviewed",
      reason: "Same table, two crops. Wider frame has stronger composition.",
    },
    {
      id: "grp_postcard",
      workspaceId,
      type: "similar",
      assetIds: ["asset_market-warm", "asset_market-cool"],
      recommendation: "asset_market-warm",
      confidence: 0.4,
      status: "unreviewed",
      reason: "Same stall, different color grade. Taste, not technical quality.",
    },
  ];

  return {
    workspaceId,
    name: "July weekend",
    assets,
    versions,
    placements: [],
    analyses,
    groups,
    choices: [],
    preference: emptyPreference(workspaceId),
    jobs: [],
    events: [
      {
        id: createId("evt"),
        actor: "system",
        operation: "load_demo",
        summary: "Loaded the prepared July weekend collection.",
        undoLabel: "Load demo",
        affectedAssetIds: assets.map((item) => item.id),
        createdAt: now,
      },
    ],
    selection: { assetIds: [], placementIds: [], shapeIds: [] },
    consent: { externalProvider: false },
    updatedAt: now,
  };
}

export function emptyCatalog(workspaceId = "ws_local"): Catalog {
  return {
    workspaceId,
    name: "Untitled workspace",
    assets: [],
    versions: [],
    placements: [],
    analyses: [],
    groups: [],
    choices: [],
    preference: emptyPreference(workspaceId),
    jobs: [],
    events: [],
    selection: { assetIds: [], placementIds: [], shapeIds: [] },
    consent: { externalProvider: false },
    updatedAt: Date.now(),
  };
}
