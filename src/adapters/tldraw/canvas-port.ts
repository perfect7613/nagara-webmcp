import { AssetRecordType, b64Vecs, createShapeId, toRichText } from "@tldraw/tlschema";
import {
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

export function createTldrawCanvasPort(getEditor: () => Editor | null): CanvasPort {
  return {
    placeImages(drafts: PlacementDraft[]) {
      const editor = must(getEditor());
      const shapeIds: string[] = [];
      const viewport = editor.getViewportPageBounds();
      drafts.forEach((draft, index) => {
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
        const scale = Math.min(1, 360 / Math.max(draft.width, draft.height));
        editor.createShape<TLImageShape>({
          id: shapeId,
          type: "image",
          x: viewport.x + 80 + index * 40,
          y: viewport.y + 80 + index * 28,
          opacity: draft.ghost ? 0.45 : 1,
          props: {
            assetId,
            w: draft.width * scale,
            h: draft.height * scale,
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
    selectShapes(shapeIds: string[]) {
      must(getEditor()).setSelectedShapes(shapeIds as TLShapeId[]);
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
      images.push({
        placementId: String(shape.meta.placementId ?? shape.id),
        assetId: String(shape.meta.assetId ?? ""),
        versionId: String(shape.meta.versionId ?? ""),
        shapeId: String(shape.id),
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

function mimeFromSrc(src: string): string {
  if (src.endsWith(".svg")) return "image/svg+xml";
  if (src.startsWith("data:")) return src.slice(5, src.indexOf(";"));
  return "image/jpeg";
}

function must<T>(value: T | null): T {
  if (!value) throw new Error("Editor is not ready.");
  return value;
}
