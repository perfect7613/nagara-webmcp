import { AssetRecordType, b64Vecs, createShapeId, toRichText } from "@tldraw/tlschema";
import {
  Box,
  type Editor,
  type TLImageShape,
  type TLShapeId,
} from "tldraw";
import type { CanvasPort, LayoutKind, PlacementDraft } from "@/modules/workspace-command";
import type {
  Affine,
  CanvasAnnotation,
  CanvasImage,
  CanvasView,
} from "@/modules/spatial-intent";
import { displaySizeForPlacement } from "@/adapters/tldraw/placement-geometry";

export function createTldrawCanvasPort(getEditor: () => Editor | null): CanvasPort {
  return {
    placeImages(drafts: PlacementDraft[]) {
      const editor = must(getEditor());
      const shapeIds: string[] = [];
      const viewport = editor.getViewportPageBounds();
      drafts.forEach((draft, index) => {
        const beside = resolveBeside(editor, draft);
        const besideBounds = beside ? editor.getShapePageBounds(beside.id) : undefined;
        const size = displaySizeForPlacement(
          draft,
          besideBounds ? { w: besideBounds.w, h: besideBounds.h } : undefined,
          { w: viewport.w, h: viewport.h },
        );
        const point = placementPoint(editor, draft, index, size, besideBounds, viewport);
        const assetId = AssetRecordType.createId();
        editor.createAssets([
          {
            id: assetId,
            typeName: "asset",
            type: "image",
            props: {
              name: draft.assetId,
              src: draft.src,
              w: draft.width,
              h: draft.height,
              mimeType: mimeFromSrc(draft.src),
              isAnimated: false,
            },
            meta: { placementId: draft.placementId, assetId: draft.assetId },
          },
        ]);
        const shapeId = createShapeId();
        editor.createShape<TLImageShape>({
          id: shapeId,
          type: "image",
          x: point.x,
          y: point.y,
          opacity: draft.ghost ? 0.45 : 1,
          props: {
            assetId,
            w: size.w,
            h: size.h,
            playing: true,
            url: "",
            crop: null,
            flipX: false,
            flipY: false,
            altText: draft.assetId,
          },
          meta: {
            placementId: draft.placementId,
            assetId: draft.assetId,
            versionId: draft.versionId,
            ghost: draft.ghost ?? false,
          },
        });
        shapeIds.push(shapeId);
      });
      return { shapeIds };
    },
    arrange(shapeIds: string[], layout: LayoutKind) {
      const editor = must(getEditor());
      const ids = shapeIds as TLShapeId[];
      const shapes = ids
        .map((id) => editor.getShape(id))
        .filter(Boolean)
        .sort((a, b) => (a!.x ?? 0) - (b!.x ?? 0));
      if (shapes.length === 0) return;
      const originX = Math.min(...shapes.map((shape) => shape!.x));
      const originY = Math.min(...shapes.map((shape) => shape!.y));
      const gap = layout === "carousel" || layout === "row" ? 28 : 20;
      shapes.forEach((shape, index) => {
        const bounds = editor.getShapePageBounds(shape!)!;
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
        editor.updateShape({ id: shape!.id, type: shape!.type, x, y });
      });
    },
    createNote(text: string) {
      const editor = must(getEditor());
      const viewport = editor.getViewportPageBounds();
      editor.createShape({
        type: "note",
        x: viewport.midX,
        y: viewport.y + 40,
        props: { richText: toRichText(text) },
      });
    },
    updateImageSrc(shapeId, src, size) {
      const editor = must(getEditor());
      const shape = editor.getShape(shapeId as TLShapeId);
      if (!shape || shape.type !== "image") return;
      const image = shape as TLImageShape;
      if (!image.props.assetId) return;
      const asset = editor.getAsset(image.props.assetId);
      if (!asset || asset.type !== "image") return;
      editor.updateAssets([
        {
          ...asset,
          props: {
            ...asset.props,
            src,
            w: size.width,
            h: size.height,
          },
        },
      ]);
      editor.updateShape({
        id: image.id,
        type: "image",
        opacity: 1,
        props: {
          ...image.props,
          w: image.props.w,
          h: image.props.h,
        },
        meta: { ...image.meta, ghost: false },
      });
    },
    markUndo(label: string) {
      const editor = getEditor();
      editor?.markHistoryStoppingPoint(label);
    },
    lookAtShape(shapeId: string) {
      const editor = must(getEditor());
      const bounds = editor.getShapePageBounds(shapeId as TLShapeId);
      if (bounds) editor.zoomToBounds(bounds, { inset: 80 });
    },
    lookAtShapes(shapeIds: string[]) {
      const editor = must(getEditor());
      const boxes = shapeIds
        .map((id) => editor.getShapePageBounds(id as TLShapeId))
        .filter((box): box is Box => Boolean(box));
      if (boxes.length === 0) return;
      editor.zoomToBounds(boxes.length === 1 ? boxes[0] : Box.Common(boxes), { inset: 72 });
    },
    selectShapes(shapeIds: string[]) {
      must(getEditor()).setSelectedShapes(shapeIds as TLShapeId[]);
    },
    undo() {
      must(getEditor()).undo();
    },
    redo() {
      must(getEditor()).redo();
    },
    canUndo() {
      const editor = getEditor();
      return editor?.getCanUndo() ?? false;
    },
    canRedo() {
      const editor = getEditor();
      return editor?.getCanRedo() ?? false;
    },
    zoomIn() {
      const editor = must(getEditor());
      editor.zoomIn(editor.getViewportScreenCenter(), { animation: { duration: 160 } });
    },
    zoomOut() {
      const editor = must(getEditor());
      editor.zoomOut(editor.getViewportScreenCenter(), { animation: { duration: 160 } });
    },
    zoomToFit() {
      must(getEditor()).zoomToFit({ animation: { duration: 200 } });
    },
    resetZoom() {
      const editor = must(getEditor());
      editor.resetZoom(editor.getViewportScreenCenter(), { animation: { duration: 160 } });
    },
    getZoomLevel() {
      return getEditor()?.getZoomLevel() ?? 1;
    },
    duplicateSelected() {
      const editor = must(getEditor());
      const selected = editor.getSelectedShapeIds();
      if (selected.length === 0) return [];
      editor.duplicateShapes(selected, { x: 36, y: 36 });
      return editor.getSelectedShapeIds().map(String);
    },
    deleteSelected() {
      const editor = must(getEditor());
      const selected = editor.getSelectedShapeIds();
      if (selected.length === 0) return;
      editor.deleteShapes(selected);
    },
    bringToFront(shapeIds) {
      const editor = must(getEditor());
      editor.bringToFront(idsOrSelected(editor, shapeIds));
    },
    sendToBack(shapeIds) {
      const editor = must(getEditor());
      editor.sendToBack(idsOrSelected(editor, shapeIds));
    },
    bringForward(shapeIds) {
      const editor = must(getEditor());
      editor.bringForward(idsOrSelected(editor, shapeIds));
    },
    sendBackward(shapeIds) {
      const editor = must(getEditor());
      editor.sendBackward(idsOrSelected(editor, shapeIds));
    },
    stampImageMeta(shapeId, meta) {
      const editor = must(getEditor());
      const shape = editor.getShape(shapeId as TLShapeId);
      if (!shape) return;
      editor.updateShape({
        id: shape.id,
        type: shape.type,
        meta: { ...shape.meta, ...meta },
      });
      if (shape.type !== "image") return;
      const image = shape as TLImageShape;
      if (!image.props.assetId) return;
      const asset = editor.getAsset(image.props.assetId);
      if (!asset) return;
      editor.updateAssets([
        {
          ...asset,
          meta: { ...asset.meta, ...meta },
        },
      ]);
    },
    async exportFrame() {
      const editor = getEditor();
      if (!editor) return null;
      const shapeIds = [...editor.getCurrentPageShapeIds()];
      if (shapeIds.length === 0) return null;
      const result = await editor.toImage(shapeIds, { format: "png", background: true });
      const href = URL.createObjectURL(result.blob);
      return { type: "image/png", href };
    },
    async exportSelection() {
      const editor = getEditor();
      if (!editor) return null;
      const shapeIds = editor.getSelectedShapeIds();
      if (shapeIds.length === 0) return null;
      const result = await editor.toImage(shapeIds, { format: "png", background: true });
      const href = URL.createObjectURL(result.blob);
      return { type: "image/png", href };
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
  const selected = editor.getSelectedShapeIds().map(String);
  const images: CanvasImage[] = [];
  const annotations: CanvasAnnotation[] = [];

  for (const shape of editor.getCurrentPageShapes()) {
    const transform = editor.getShapePageTransform(shape);
    const bounds = editor.getShapePageBounds(shape);
    if (!transform || !bounds) continue;
    const affine: Affine = {
      a: transform.a,
      b: transform.b,
      c: transform.c,
      d: transform.d,
      e: transform.e,
      f: transform.f,
    };

    if (shape.type === "image") {
      const image = shape as TLImageShape;
      const asset = image.props.assetId ? editor.getAsset(image.props.assetId) : null;
      const metaPlacement = shape.meta.placementId
        ? String(shape.meta.placementId)
        : "";
      images.push({
        placementId: metaPlacement,
        assetId: shape.meta.assetId ? String(shape.meta.assetId) : "",
        versionId: shape.meta.versionId ? String(shape.meta.versionId) : "",
        shapeId: String(shape.id),
        src: asset && asset.type === "image" ? asset.props.src ?? "" : "",
        pageTransform: affine,
        width: image.props.w,
        height: image.props.h,
        sourceWidth: asset && asset.type === "image" ? asset.props.w : image.props.w,
        sourceHeight: asset && asset.type === "image" ? asset.props.h : image.props.h,
      });
      continue;
    }

    if (
      shape.type === "draw" ||
      shape.type === "highlight" ||
      shape.type === "geo" ||
      shape.type === "arrow" ||
      shape.type === "note" ||
      shape.type === "text"
    ) {
      annotations.push({
        id: String(shape.id),
        kind:
          shape.type === "draw" || shape.type === "highlight"
            ? "scribble"
            : shape.type === "arrow"
              ? "arrow"
              : shape.type === "note" || shape.type === "text"
                ? "note"
                : shape.type === "geo" && "geo" in shape.props && shape.props.geo === "ellipse"
                  ? "circle"
                  : "rect",
        selected: selected.includes(String(shape.id)),
        pageBounds: { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h },
        pagePoints: pointsOf(editor, shape.id),
        text: textOf(shape as unknown as { type: string; props: Record<string, unknown> }),
      });
    }
  }

  const viewport = editor.getViewportPageBounds();
  return {
    images,
    annotations,
    selectedShapeIds: selected,
    viewport: { x: viewport.x, y: viewport.y, w: viewport.w, h: viewport.h },
  };
}

function pointsOf(editor: Editor, shapeId: TLShapeId): { x: number; y: number }[] | undefined {
  const shape = editor.getShape(shapeId);
  if (!shape || (shape.type !== "draw" && shape.type !== "highlight")) return undefined;
  const segments = (
    shape.props as { segments?: Array<{ path?: string; dim?: 2 | 3 }> }
  ).segments;
  const local =
    segments?.flatMap((segment) =>
      segment.path ? b64Vecs.decodePoints(segment.path, segment.dim ?? 3) : [],
    ) ?? [];
  const transform = editor.getShapePageTransform(shape);
  if (!transform) return local.map((point) => ({ x: point.x, y: point.y }));
  return local.map((point) => transform.applyToPoint(point));
}

function textOf(shape: { type: string; props: Record<string, unknown> }): string | undefined {
  if (typeof shape.props.text === "string") return shape.props.text;
  const rich = shape.props.richText as { content?: Array<{ content?: Array<{ text?: string }> }> } | undefined;
  const pieces =
    rich?.content?.flatMap((block) => block.content?.map((node) => node.text ?? "") ?? []) ?? [];
  const text = pieces.join(" ").trim();
  return text || undefined;
}

function resolveBeside(editor: Editor, draft: PlacementDraft) {
  if (draft.besideShapeId) {
    const named = editor.getShape(draft.besideShapeId as TLShapeId);
    if (named) return named;
  }
  const selected = editor.getSelectedShapes().find((shape) => shape.type === "image");
  if (selected) return selected;
  return (
    editor.getCurrentPageShapes().find(
      (shape) => shape.type === "image" && shape.meta.ghost !== true,
    ) ?? null
  );
}

function placementPoint(
  editor: Editor,
  _draft: PlacementDraft,
  index: number,
  size: { w: number; h: number },
  besideBounds: Box | undefined,
  viewport: Box,
) {
  if (besideBounds) {
    let x = besideBounds.maxX + 32;
    const siblings = editor
      .getCurrentPageShapes()
      .filter((shape) => shape.type === "image")
      .map((shape) => editor.getShapePageBounds(shape.id))
      .filter((box): box is Box => Boolean(box))
      .filter(
        (box) => box.x >= besideBounds.maxX - 4 && Math.abs(box.y - besideBounds.y) < 48,
      )
      .sort((a, b) => a.x - b.x);
    for (const box of siblings) {
      if (box.x < x + 8) x = box.maxX + 32;
    }
    return { x: x + index * (size.w + 24), y: besideBounds.y };
  }
  return {
    x: viewport.midX - size.w / 2 + index * 36,
    y: viewport.midY - size.h / 2 + index * 24,
  };
}

function idsOrSelected(editor: Editor, shapeIds?: string[]) {
  if (shapeIds && shapeIds.length > 0) return shapeIds as TLShapeId[];
  return editor.getSelectedShapeIds();
}

function mimeFromSrc(src: string): string {
  if (src.endsWith(".svg")) return "image/svg+xml";
  if (src.startsWith("data:")) return src.slice(5, src.indexOf(";"));
  return "image/jpeg";
}

function must<T>(value: T | null): T {
  if (!value) throw new Error("Editor is not ready.");
  return value;
}
