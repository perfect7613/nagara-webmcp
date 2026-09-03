import { describe, expect, it } from "vitest";
import {
  resolveSpatialIntent,
  rasterizeScribble,
  type CanvasView,
} from "@/modules/spatial-intent";

const image = {
  placementId: "plc_1",
  assetId: "asset_lake",
  versionId: "ver_lake",
  shapeId: "shape_img",
  pageTransform: { a: 1, b: 0, c: 0, d: 1, e: 100, f: 80 },
  width: 400,
  height: 260,
  sourceWidth: 1400,
  sourceHeight: 900,
};

function view(partial: Partial<CanvasView>): CanvasView {
  return {
    images: [image],
    annotations: [],
    selectedShapeIds: [],
    viewport: { x: 0, y: 0, w: 1000, h: 800 },
    ...partial,
  };
}

describe("spatial intent resolver", () => {
  it("returns none when nothing is pointed at", () => {
    const intent = resolveSpatialIntent(view({}));
    expect(intent.kind).toBe("none");
  });

  it("resolves a circle overlapping one photo", () => {
    const intent = resolveSpatialIntent(
      view({
        annotations: [
          {
            id: "ann_1",
            kind: "circle",
            selected: true,
            pageBounds: { x: 320, y: 200, w: 80, h: 80 },
          },
        ],
      }),
    );
    expect(intent.kind).toBe("clear");
    if (intent.kind === "clear") {
      expect(intent.target.assetId).toBe("asset_lake");
      expect(intent.region).toBeTruthy();
      expect(intent.mask).toBeTruthy();
    }
  });

  it("asks for clarification when two photos are equally overlapped", () => {
    const second = {
      ...image,
      placementId: "plc_2",
      assetId: "asset_other",
      shapeId: "shape_img_2",
      pageTransform: { a: 1, b: 0, c: 0, d: 1, e: 160, f: 90 },
    };
    const intent = resolveSpatialIntent(
      view({
        images: [image, second],
        annotations: [
          {
            id: "ann_1",
            kind: "scribble",
            selected: true,
            pageBounds: { x: 200, y: 120, w: 180, h: 140 },
            pagePoints: [
              { x: 240, y: 160 },
              { x: 300, y: 190 },
            ],
          },
        ],
      }),
    );
    expect(intent.kind).toBe("ambiguous");
  });

  it("treats a zero-height scribble as overlapping a photo", () => {
    const intent = resolveSpatialIntent(
      view({
        annotations: [
          {
            id: "ann_line",
            kind: "scribble",
            selected: true,
            pageBounds: { x: 180, y: 200, w: 80, h: 0 },
            pagePoints: [
              { x: 180, y: 200 },
              { x: 260, y: 200 },
            ],
          },
        ],
      }),
    );
    expect(intent.kind).toBe("clear");
  });

  it("asks for clarification when several photos are selected and nothing is drawn", () => {
    const second = {
      ...image,
      placementId: "plc_2",
      assetId: "asset_other",
      shapeId: "shape_img_2",
      pageTransform: { a: 1, b: 0, c: 0, d: 1, e: 600, f: 80 },
    };
    const intent = resolveSpatialIntent(
      view({
        images: [image, second],
        selectedShapeIds: ["shape_img", "shape_img_2"],
      }),
    );
    expect(intent.kind).toBe("ambiguous");
  });

  it("rasterizes a scribble into a non-empty mask", () => {
    const mask = rasterizeScribble(
      [
        { x: 20, y: 20 },
        { x: 40, y: 24 },
        { x: 70, y: 30 },
      ],
      { width: 100, height: 80 },
      4,
    );
    expect(mask.bytes.some((value) => value === 255)).toBe(true);
    expect(mask.bytes.some((value) => value === 0)).toBe(true);
  });
});
