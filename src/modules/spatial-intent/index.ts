export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface CanvasImage {
  placementId: string;
  assetId: string;
  versionId: string;
  shapeId: string;
  pageTransform: Affine;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  crop?: Box;
}

export type AnnotationKind =
  | "circle"
  | "rect"
  | "scribble"
  | "arrow"
  | "note"
  | "sketch";

export interface CanvasAnnotation {
  id: string;
  kind: AnnotationKind;
  selected: boolean;
  pageBounds: Box;
  pagePoints?: Point[];
  text?: string;
}

export interface CanvasView {
  images: CanvasImage[];
  annotations: CanvasAnnotation[];
  selectedShapeIds: string[];
  viewport: Box;
}

export interface ImageTarget {
  placementId: string;
  assetId: string;
  versionId: string;
  shapeId: string;
  overlap: number;
}

export interface NormalizedRegion {
  /** Axis-aligned box in source-image pixels. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AlphaMask {
  width: number;
  height: number;
  bytes: Uint8Array;
}

export type SpatialIntent =
  | {
      kind: "clear";
      target: ImageTarget;
      region?: NormalizedRegion;
      mask?: AlphaMask;
      notes: string[];
      annotationKinds: AnnotationKind[];
    }
  | {
      kind: "ambiguous";
      candidates: ImageTarget[];
      reason: string;
    }
  | {
      kind: "none";
      reason: string;
    };

const IDENTITY: Affine = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function invertAffine(m: Affine): Affine {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-8) return IDENTITY;
  return {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det,
    e: (m.c * m.f - m.d * m.e) / det,
    f: (m.b * m.e - m.a * m.f) / det,
  };
}

export function applyAffine(m: Affine, p: Point): Point {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}

export function boxCenter(box: Box): Point {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

export function inflateBox(box: Box, pad = 8): Box {
  return {
    x: box.x - pad,
    y: box.y - pad,
    w: Math.max(pad * 2, box.w + pad * 2),
    h: Math.max(pad * 2, box.h + pad * 2),
  };
}

export function boxOverlap(a: Box, b: Box): number {
  const left = inflateBox(a);
  const x = Math.max(0, Math.min(left.x + left.w, b.x + b.w) - Math.max(left.x, b.x));
  const y = Math.max(0, Math.min(left.y + left.h, b.y + b.h) - Math.max(left.y, b.y));
  const area = x * y;
  if (area <= 0) return 0;
  const denom = Math.max(1, Math.min(left.w * left.h, b.w * b.h));
  return area / denom;
}

export function imagePageBox(image: CanvasImage): Box {
  const corners = [
    applyAffine(image.pageTransform, { x: 0, y: 0 }),
    applyAffine(image.pageTransform, { x: image.width, y: 0 }),
    applyAffine(image.pageTransform, { x: image.width, y: image.height }),
    applyAffine(image.pageTransform, { x: 0, y: image.height }),
  ];
  const xs = corners.map((p) => p.x);
  const ys = corners.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

export function pagePointToSource(image: CanvasImage, page: Point): Point {
  const local = applyAffine(invertAffine(image.pageTransform), page);
  const crop = image.crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const u = crop.x + (local.x / image.width) * crop.w;
  const v = crop.y + (local.y / image.height) * crop.h;
  return {
    x: u * image.sourceWidth,
    y: v * image.sourceHeight,
  };
}

export function rasterizeScribble(
  points: Point[],
  source: Size,
  radius = 24,
): AlphaMask {
  const width = Math.max(1, Math.round(source.width));
  const height = Math.max(1, Math.round(source.height));
  const bytes = new Uint8Array(width * height);
  const r2 = radius * radius;

  const stamp = (x: number, y: number) => {
    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(width - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(height - 1, Math.ceil(y + radius));
    for (let py = minY; py <= maxY; py += 1) {
      for (let px = minX; px <= maxX; px += 1) {
        const dx = px - x;
        const dy = py - y;
        if (dx * dx + dy * dy <= r2) bytes[py * width + px] = 255;
      }
    }
  };

  if (points.length === 0) return { width, height, bytes };

  stamp(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(dist / (radius / 2)));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      stamp(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    }
  }

  return { width, height, bytes };
}

export function maskToPngDataUrl(mask: AlphaMask): string {
  const { width, height, bytes } = mask;
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < bytes.length; i += 1) {
    const o = i * 4;
    rgba[o] = 255;
    rgba[o + 1] = 255;
    rgba[o + 2] = 255;
    rgba[o + 3] = bytes[i];
  }
  return rgbaToPngDataUrl(width, height, rgba);
}

export function resolveSpatialIntent(view: CanvasView): SpatialIntent {
  const selectedAnnotations = view.annotations.filter((item) => item.selected);
  const annotations =
    selectedAnnotations.length > 0
      ? selectedAnnotations
      : view.annotations.filter((item) =>
          view.selectedShapeIds.includes(item.id),
        );
  const relevant =
    annotations.length > 0
      ? annotations
      : view.annotations.filter((item) => item.kind === "note");

  const selectedImages = view.images.filter((image) =>
    view.selectedShapeIds.includes(image.shapeId),
  );

  const notes = view.annotations
    .filter((item) => item.kind === "note" && item.text)
    .map((item) => item.text!)
    .filter(Boolean);

  if (view.images.length === 0) {
    return { kind: "none", reason: "No photos are on the canvas." };
  }

  const targeting = relevant.filter((item) => item.kind !== "note");
  if (targeting.length === 0 && selectedImages.length === 1) {
    return {
      kind: "clear",
      target: toTarget(selectedImages[0], 1),
      notes,
      annotationKinds: [],
    };
  }

  if (targeting.length === 0 && selectedImages.length > 1) {
    return {
      kind: "ambiguous",
      candidates: selectedImages.map((image) => toTarget(image, 1)),
      reason: "Several photos are selected. Select one photo, or draw on the one to edit.",
    };
  }

  if (targeting.length === 0 && selectedImages.length === 0) {
    if (notes.length > 0) {
      return {
        kind: "none",
        reason:
          "Frame notes are present, but no photo or pointing annotation is selected.",
      };
    }
    return {
      kind: "none",
      reason: "Select a photo or draw on one to point at a region.",
    };
  }

  const scored = new Map<string, { image: CanvasImage; overlap: number }>();
  for (const annotation of targeting) {
    for (const image of view.images) {
      const overlap = boxOverlap(annotation.pageBounds, imagePageBox(image));
      if (overlap <= 0.02) continue;
      const current = scored.get(image.placementId);
      const nextOverlap = Math.max(current?.overlap ?? 0, overlap);
      scored.set(image.placementId, { image, overlap: nextOverlap });
    }
  }

  if (selectedImages.length === 1) {
    const selected = selectedImages[0];
    const hit = scored.get(selected.placementId);
    if (hit || targeting.length === 0) {
      return buildClear(selected, hit?.overlap ?? 1, targeting, notes);
    }
  }

  const ranked = [...scored.values()].sort((a, b) => b.overlap - a.overlap);
  if (ranked.length === 0) {
    return {
      kind: "none",
      reason: "The drawing does not overlap a photo. Circle the object on the image.",
    };
  }

  if (ranked.length > 1 && ranked[0].overlap - ranked[1].overlap < 0.12) {
    return {
      kind: "ambiguous",
      candidates: ranked.slice(0, 4).map((row) => toTarget(row.image, row.overlap)),
      reason:
        "That annotation touches more than one photo. Select the intended photo, then try again.",
    };
  }

  return buildClear(ranked[0].image, ranked[0].overlap, targeting, notes);
}

function buildClear(
  image: CanvasImage,
  overlap: number,
  annotations: CanvasAnnotation[],
  notes: string[],
): SpatialIntent {
  const pageBox = imagePageBox(image);
  const targeting = annotations.filter(
    (item) => item.kind !== "note" && boxOverlap(item.pageBounds, pageBox) > 0.02,
  );
  const bounds = targeting.map((item) => item.pageBounds);
  const region = bounds.length
    ? regionFromPageBoxes(image, bounds)
    : undefined;

  const scale = Math.max(
    image.sourceWidth / Math.max(1, image.width),
    image.sourceHeight / Math.max(1, image.height),
  );
  const scribblePoints = targeting
    .filter((item) => item.kind === "scribble" || item.kind === "sketch")
    .flatMap((item) => item.pagePoints ?? [])
    .map((point) => pagePointToSource(image, point));

  const mask =
    scribblePoints.length > 1
      ? rasterizeScribble(
          scribblePoints,
          {
            width: image.sourceWidth,
            height: image.sourceHeight,
          },
          Math.max(8, 14 * scale),
        )
      : region
        ? rasterizeBox(region, {
            width: image.sourceWidth,
            height: image.sourceHeight,
          })
        : undefined;

  return {
    kind: "clear",
    target: toTarget(image, overlap),
    region,
    mask,
    notes,
    annotationKinds: targeting.map((item) => item.kind),
  };
}

function regionFromPageBoxes(image: CanvasImage, boxes: Box[]): NormalizedRegion {
  const points = boxes.flatMap((box) => [
    pagePointToSource(image, { x: box.x, y: box.y }),
    pagePointToSource(image, { x: box.x + box.w, y: box.y }),
    pagePointToSource(image, { x: box.x + box.w, y: box.y + box.h }),
    pagePointToSource(image, { x: box.x, y: box.y + box.h }),
  ]);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = clamp(Math.min(...xs), 0, image.sourceWidth);
  const y = clamp(Math.min(...ys), 0, image.sourceHeight);
  const x2 = clamp(Math.max(...xs), 0, image.sourceWidth);
  const y2 = clamp(Math.max(...ys), 0, image.sourceHeight);
  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.max(1, Math.round(x2 - x)),
    h: Math.max(1, Math.round(y2 - y)),
  };
}

function rasterizeBox(region: NormalizedRegion, source: Size): AlphaMask {
  const width = Math.max(1, Math.round(source.width));
  const height = Math.max(1, Math.round(source.height));
  const bytes = new Uint8Array(width * height);
  const minX = clamp(Math.floor(region.x), 0, width - 1);
  const minY = clamp(Math.floor(region.y), 0, height - 1);
  const maxX = clamp(Math.ceil(region.x + region.w), 0, width);
  const maxY = clamp(Math.ceil(region.y + region.h), 0, height);
  for (let y = minY; y < maxY; y += 1) {
    bytes.fill(255, y * width + minX, y * width + maxX);
  }
  return { width, height, bytes };
}

function toTarget(image: CanvasImage, overlap: number): ImageTarget {
  return {
    placementId: image.placementId,
    assetId: image.assetId,
    versionId: image.versionId,
    shapeId: image.shapeId,
    overlap,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rgbaToPngDataUrl(
  width: number,
  height: number,
  rgba: Uint8Array,
): string {
  // Uncompressed PNG encoder (RGBA). Fine for masks in tests and jobs.
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), rowStart + 1);
  }
  const compressed = zlibStore(raw);
  const ihdr = new Uint8Array(13);
  writeU32(ihdr, 0, width);
  writeU32(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const chunks = [
    pngChunk(0x49484452, ihdr),
    pngChunk(0x49444154, compressed),
    pngChunk(0x49454e44, new Uint8Array()),
  ];
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = concat([signature, ...chunks]);
  return `data:image/png;base64,${u8ToB64(png)}`;
}

function pngChunk(type: number, data: Uint8Array): Uint8Array {
  const body = new Uint8Array(4 + data.length);
  body[0] = (type >>> 24) & 255;
  body[1] = (type >>> 16) & 255;
  body[2] = (type >>> 8) & 255;
  body[3] = type & 255;
  body.set(data, 4);
  const crc = crc32(body);
  const out = new Uint8Array(8 + data.length + 4);
  writeU32(out, 0, data.length);
  out.set(body, 4);
  writeU32(out, 8 + data.length, crc);
  return out;
}

function zlibStore(data: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = [];
  const max = 65535;
  for (let i = 0; i < data.length; i += max) {
    const slice = data.subarray(i, i + max);
    const last = i + max >= data.length;
    const block = new Uint8Array(5 + slice.length);
    block[0] = last ? 1 : 0;
    block[1] = slice.length & 255;
    block[2] = (slice.length >> 8) & 255;
    const nlen = ~slice.length & 0xffff;
    block[3] = nlen & 255;
    block[4] = (nlen >> 8) & 255;
    block.set(slice, 5);
    blocks.push(block);
  }
  const adler = adler32(data);
  const header = new Uint8Array([0x78, 0x01]);
  const footer = new Uint8Array(4);
  writeU32(footer, 0, adler);
  return concat([header, ...blocks, footer]);
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < data.length; i += 1) {
    a = (a + data[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function writeU32(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >>> 24) & 255;
  target[offset + 1] = (value >>> 16) & 255;
  target[offset + 2] = (value >>> 8) & 255;
  target[offset + 3] = value & 255;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function u8ToB64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i += 1) binary += String.fromCharCode(data[i]);
  if (typeof btoa === "function") return btoa(binary);
  return Buffer.from(data).toString("base64");
}
