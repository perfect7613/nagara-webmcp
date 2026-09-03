import { describe, expect, it } from "vitest";
import { emptyPreference, learnFromComparison } from "@/modules/preference-profile";

describe("preference profile", () => {
  it("learns that expression outweighs sharpness", () => {
    const preference = learnFromComparison(
      emptyPreference("ws"),
      {
        sharpness: 0.71,
        expression: 0.96,
        composition: 0.68,
        brightness: 0.6,
        faceVisibility: 0.88,
      },
      [
        {
          sharpness: 0.94,
          expression: 0.42,
          composition: 0.55,
          brightness: 0.62,
          faceVisibility: 0.7,
        },
      ],
    );
    expect(preference.weights.expression).toBeGreaterThan(preference.weights.sharpness);
    expect(preference.summaryLines[0]).toMatch(/Expression/i);
  });
});
