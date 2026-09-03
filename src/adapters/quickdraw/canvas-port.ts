import {
  newId,
  pageBounds,
  type Bounds,
  type Editor,
  type ShapeRecord,
} from "@quickdrawjs/core";
import type { CanvasPort, LayoutKind, PlacementDraft } from "@/modules/workspace-command";
import type {
  Affine,
  CanvasAnnotation,
  CanvasImage,
  CanvasView,
} from "@/modules/spatial-intent";
import { displaySizeForPlacement } from "@/adapters/quickdraw/placement-geometry";

export function createCanvasPort(getEditor: () => Editor | null): CanvasPort {
  return {
    placeImages(drafts: PlacementDraft[]) {
      const editor = must(getEditor());
      const shapeIds: string[] = [];
      const viewport = editor.viewportPageBounds();
      editor.store.transact(() => {
      drafts.forEach((draft, index) => {
        const beside = resolveBeside(editor, draft);
        const besideBox = beside ? pageBounds(beside) : undefined;
        const size = displaySizeForPlacement(
          draft,
          besideBox ? { w: besideBox.w, h: besideBox.h } : undefined,
          { w: viewport.w, h: viewport.h },
        );
        const point = placementPoint(editor, index, size, besideBox, viewport);
        const assetId = newId("asset");
        const shapeId = newId("shape");
        editor.store.put({
          id: assetId,
          typeName: "asset",
          src: draft.src,
          w: draft.width,
          h: draft.height,
        });
        editor.store.put({
          id: shapeId,
          typeName: "shape",
          type: "image",
          x: point.x,
          y: point.y,
          rot: 0,
          z: editor.store.maxZ() + 1,
          props: {
            w: size.w,
            h: size.h,
            assetId,
            placementId: draft.placementId,
            keepersAssetId: draft.assetId,
            versionId: draft.versionId,
            ghost: draft.ghost ?? false,
          },
        });
        shapeIds.push(shapeId);
      });
      });
      return { shapeIds };
    },
    arrange(shapeIds: string[], layout: LayoutKind) {
      const editor = must(getEditor());
      const shapes = shapeIds
        .map((id) => asShape(editor, id))
        .filter((shape): shape is ShapeRecord => Boolean(shape))
        .sort((a, b) => a.x - b.x);
      if (shapes.length === 0) return;
      const originX = Math.min(...shapes.map((shape) => shape.x));
      const originY = Math.min(...shapes.map((shape) => shape.y));
      const gap = layout === "carousel" || layout === "row" ? 28 : 20;
      editor.store.transact(() => {
        shapes.forEach((shape, index) => {
          const bounds = pageBounds(shape);
          let x = originX;
          let y = originY;
          if (layout === "row" || layout === "carousel" || layout === "contact-sheet") {
            x = originX + index * (bounds.w + gap);
          } else if (layout === "column") {
            y = originY + index * (bounds.h + gap);
          } else if (layout === "comparison") {
            x = originX + index * (bounds.w + 12);
          } else if (layout === "postcard") {
            const col = index % 2;
            const row = Math.floor(index / 2);
            x = originX + col * (bounds.w + 24);
            y = originY + row * (bounds.h + 24);
          } else {
            const col = index % 3;
            const row = Math.floor(index / 3);
            x = originX + col * (bounds.w + gap);
            y = originY + row * (bounds.h + gap);
          }
          editor.store.update(shape.id, { x, y });
        });
      });
    },
    createNote(text: string) {
      const editor = must(getEditor());
      const viewport = editor.viewportPageBounds();
      editor.store.put({
        id: newId("shape"),
        typeName: "shape",
        type: "note",
        x: viewport.x + viewport.w / 2 - 100,
        y: viewport.y + 40,
        rot: 0,
        z: editor.store.maxZ() + 1,
        props: { text },
      });
    },
    updateImageSrc(shapeId, src, size) {
      const editor = must(getEditor());
      const shape = asShape(editor, shapeId);
      if (!shape || shape.type !== "image") return;
      const assetId = String(shape.props.assetId ?? "");
      if (!assetId) return;
      editor.store.transact(() => {
        const asset = editor.store.asset(assetId);
        if (asset) {
          editor.store.put({
            ...asset,
            src,
            w: size.width,
            h: size.height,
          });
        }
        editor.store.update(shapeId, { props: { ghost: false } });
      });
    },
    markUndo() {
      /* Quickdraw batches history per gesture */
    },
    lookAtShape(shapeId: string) {
      const editor = must(getEditor());
      const shape = asShape(editor, shapeId);
      if (!shape) return;
      editor.followBounds(pageBounds(shape), { animate: 200 });
    },
    lookAtShapes(shapeIds: string[]) {
      const editor = must(getEditor());
      const boxes = shapeIds
        .map((id) => asShape(editor, id))
        .filter((shape): shape is ShapeRecord => Boolean(shape))
        .map((shape) => pageBounds(shape));
      if (boxes.length === 0) return;
      editor.followBounds(unionBounds(boxes), { animate: 200 });
    },
    selectShapes(shapeIds: string[]) {
      must(getEditor()).setSelection(shapeIds);
    },
    undo() {
      must(getEditor()).store.undo();
    },
    redo() {
      must(getEditor()).store.redo();
    },
    canUndo() {
      return getEditor()?.store.canUndo ?? false;
    },
    canRedo() {
      return getEditor()?.store.canRedo ?? false;
    },
    zoomIn() {
      zoomFromCenter(must(getEditor()), 1.25);
    },
    zoomOut() {
      zoomFromCenter(must(getEditor()), 1 / 1.25);
    },
    zoomToFit() {
      must(getEditor()).fitContent({ animate: 200 });
    },
    resetZoom() {
      const editor = must(getEditor());
      zoomFromCenter(editor, 1 / Math.max(editor.camera.z, 0.01));
    },
    getZoomLevel() {
      return getEditor()?.camera.z ?? 1;
    },
    duplicateSelected() {
      const editor = must(getEditor());
      if (editor.selection.size === 0) return [];
      editor.duplicateSelection(36);
      return [...editor.selection];
    },
    deleteSelected() {
      must(getEditor()).deleteSelection();
    },
    bringToFront(shapeIds) {
      const editor = must(getEditor());
      if (shapeIds?.length) editor.setSelection(shapeIds);
      editor.bringToFront();
    },
    sendToBack(shapeIds) {
      const editor = must(getEditor());
      if (shapeIds?.length) editor.setSelection(shapeIds);
      editor.sendToBack();
    },
    bringForward(shapeIds) {
      this.bringToFront(shapeIds);
    },
    sendBackward(shapeIds) {
      this.sendToBack(shapeIds);
    },
    stampImageMeta(shapeId, meta) {
      const editor = must(getEditor());
      const shape = asShape(editor, shapeId);
      if (!shape) return;
      editor.store.update(shapeId, {
        props: {
          placementId: meta.placementId,
          keepersAssetId: meta.assetId,
          versionId: meta.versionId,
        },
      });
    },
    async exportFrame() {
      const editor = getEditor();
      if (!editor) return null;
      const blob = await editor.exportImage({ background: true });
      if (!blob) return null;
      return { type: "image/png", href: URL.createObjectURL(blob) };
    },
    async exportSelection() {
      const editor = getEditor();
      if (!editor || editor.selection.size === 0) return null;
      const blob = await editor.exportImage({
        background: true,
        ids: new Set(editor.selection),
      });
      if (!blob) return null;
      return { type: "image/png", href: URL.createObjectURL(blob) };
    },
  };
}

export function readCanvasView(editor: Editor | null): CanvasView {
  if (!editor) {
    return {
      images: [],
      annotations: [],
      selectedShapeIds: [],
      viewport: { x: 0, y: 0, w: 1, h: 1 },
    };
  }
  const selected = [...editor.selection];
  const images: CanvasImage[] = [];
  const annotations: CanvasAnnotation[] = [];

  for (const shape of editor.store.shapes()) {
    const bounds = pageBounds(shape);
    const affine = affineOf(shape);

    if (shape.type === "image") {
      const asset = shape.props.assetId
        ? editor.store.asset(String(shape.props.assetId))
        : null;
      images.push({
        placementId: shape.props.placementId ? String(shape.props.placementId) : "",
        assetId: shape.props.keepersAssetId ? String(shape.props.keepersAssetId) : "",
        versionId: shape.props.versionId ? String(shape.props.versionId) : "",
        shapeId: shape.id,
        src: asset?.src ?? "",
        pageTransform: affine,
        width: Number(shape.props.w ?? bounds.w),
        height: Number(shape.props.h ?? bounds.h),
        sourceWidth: asset?.w ?? Number(shape.props.w ?? bounds.w),
        sourceHeight: asset?.h ?? Number(shape.props.h ?? bounds.h),
      });
      continue;
    }

    if (
      shape.type === "draw" ||
      shape.type === "highlight" ||
      shape.type === "geo" ||
      shape.type === "arrow" ||
      shape.type === "line" ||
      shape.type === "note" ||
      shape.type === "text"
    ) {
      annotations.push({
        id: shape.id,
        kind:
          shape.type === "draw" || shape.type === "highlight"
            ? "scribble"
            : shape.type === "arrow" || shape.type === "line"
              ? "arrow"
              : shape.type === "note" || shape.type === "text"
                ? "note"
                : shape.props.geo === "ellipse"
                  ? "circle"
                  : "rect",
        selected: selected.includes(shape.id),
        pageBounds: { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h },
        pagePoints: pointsOf(shape),
        text: typeof shape.props.text === "string" ? shape.props.text : undefined,
      });
    }
  }

  const viewport = editor.viewportPageBounds();
  return {
    images,
    annotations,
    selectedShapeIds: selected,
    viewport: { x: viewport.x, y: viewport.y, w: viewport.w, h: viewport.h },
  };
}

function pointsOf(shape: ShapeRecord): { x: number; y: number }[] | undefined {
  if (shape.type !== "draw" && shape.type !== "highlight") return undefined;
  const pts = shape.props.pts;
  if (!Array.isArray(pts)) return undefined;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < pts.length; i += 3) {
    points.push({ x: shape.x + Number(pts[i]), y: shape.y + Number(pts[i + 1]) });
  }
  return points;
}

function affineOf(shape: ShapeRecord): Affine {
  const rot = shape.rot ?? 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return { a: cos, b: sin, c: -sin, d: cos, e: shape.x, f: shape.y };
}

function resolveBeside(editor: Editor, draft: PlacementDraft) {
  if (draft.besideShapeId) {
    const named = asShape(editor, draft.besideShapeId);
    if (named) return named;
  }
  const selected = [...editor.selection]
    .map((id) => asShape(editor, id))
    .find((shape) => shape?.type === "image");
  if (selected) return selected;
  return (
    editor.store.shapes().find(
      (shape) => shape.type === "image" && shape.props.ghost !== true,
    ) ?? null
  );
}

function placementPoint(
  editor: Editor,
  index: number,
  size: { w: number; h: number },
  besideBounds: Bounds | undefined,
  viewport: Bounds,
) {
  if (besideBounds) {
    let x = besideBounds.x + besideBounds.w + 32;
    const siblings = editor.store
      .shapes()
      .filter((shape) => shape.type === "image")
      .map((shape) => pageBounds(shape))
      .filter(
        (box) =>
          box.x >= besideBounds.x + besideBounds.w - 4 &&
          Math.abs(box.y - besideBounds.y) < 48,
      )
      .sort((a, b) => a.x - b.x);
    for (const box of siblings) {
      if (box.x < x + 8) x = box.x + box.w + 32;
    }
    return { x: x + index * (size.w + 24), y: besideBounds.y };
  }
  return {
    x: viewport.x + viewport.w / 2 - size.w / 2 + index * 36,
    y: viewport.y + viewport.h / 2 - size.h / 2 + index * 24,
  };
}

function asShape(editor: Editor, id: string): ShapeRecord | null {
  const rec = editor.store.get(id);
  if (!rec || rec.typeName === "asset") return null;
  return rec;
}

function unionBounds(boxes: Bounds[]): Bounds {
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.w));
  const maxY = Math.max(...boxes.map((box) => box.y + box.h));
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function zoomFromCenter(editor: Editor, mult: number) {
  const { w, h } = editor.viewSize();
  editor.zoomAt(w / 2, h / 2, mult, { animate: 160 });
}

function must<T>(value: T | null): T {
  if (!value) throw new Error("Editor is not ready.");
  return value;
}
