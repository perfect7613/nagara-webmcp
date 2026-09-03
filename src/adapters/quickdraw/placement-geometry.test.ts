import { describe, expect, it } from "vitest";
import { displaySizeForPlacement } from "@/adapters/quickdraw/placement-geometry";

describe("displaySizeForPlacement", () => {
  it("matches the source bounds for a ghost placed beside it", () => {
    const size = displaySizeForPlacement(
      { width: 1600, height: 900 },
      { w: 420, h: 280 },
      { w: 1400, h: 900 },
    );
    expect(size).toEqual({ w: 420, h: 280 });
  });

  it("does not use native aspect when the source was resized on the table", () => {
    const size = displaySizeForPlacement(
      { width: 1200, height: 800 },
      { w: 400, h: 300 },
      { w: 1400, h: 900 },
    );
    expect(size).toEqual({ w: 400, h: 300 });
  });

  it("fits a first placement to the viewport when nothing is beside it", () => {
    const size = displaySizeForPlacement(
      { width: 2000, height: 1000 },
      undefined,
      { w: 1000, h: 800 },
    );
    expect(size.w).toBe(520);
    expect(size.h).toBe(260);
  });
});
