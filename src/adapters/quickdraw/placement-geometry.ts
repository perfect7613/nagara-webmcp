export type Size = { w: number; h: number };

/** Ghost Qwen edits copy the source's on-table size; other placements fit the viewport. */
export function displaySizeForPlacement(
  draft: { width: number; height: number },
  beside: Size | undefined,
  viewport: Size,
): Size {
  if (beside && beside.w > 8 && beside.h > 8) {
    return { w: beside.w, h: beside.h };
  }
  const maxSide = Math.min(Math.max(viewport.w, 320) * 0.52, 860);
  const scale = Math.min(1, maxSide / Math.max(draft.width, draft.height, 1));
  return { w: draft.width * scale, h: draft.height * scale };
}
