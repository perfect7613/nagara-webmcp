import type {
  Catalog,
  FeatureName,
  PreferenceProfile,
  QualitySignals,
} from "@/domain/types";

export const FEATURES: FeatureName[] = [
  "sharpness",
  "expression",
  "composition",
  "brightness",
  "faceVisibility",
];

export function emptyPreference(workspaceId: string): PreferenceProfile {
  return {
    workspaceId,
    weights: {
      sharpness: 0,
      expression: 0,
      composition: 0,
      brightness: 0,
      faceVisibility: 0,
    },
    evidence: {
      sharpness: 0,
      expression: 0,
      composition: 0,
      brightness: 0,
      faceVisibility: 0,
    },
    summaryLines: ["No choices recorded yet."],
    updatedAt: Date.now(),
  };
}

export function scoreAsset(
  signals: QualitySignals,
  preference: PreferenceProfile,
): number {
  return FEATURES.reduce(
    (sum, feature) => sum + signals[feature] * preference.weights[feature],
    0,
  );
}

export function learnFromComparison(
  preference: PreferenceProfile,
  preferred: QualitySignals,
  rejected: QualitySignals[],
): PreferenceProfile {
  const next: PreferenceProfile = {
    ...preference,
    weights: { ...preference.weights },
    evidence: { ...preference.evidence },
    updatedAt: Date.now(),
  };

  for (const other of rejected) {
    for (const feature of FEATURES) {
      const delta = preferred[feature] - other[feature];
      if (Math.abs(delta) < 0.08) continue;
      next.weights[feature] += delta;
      next.evidence[feature] += Math.abs(delta);
    }
  }

  next.summaryLines = summarize(next);
  return next;
}

export function summarize(preference: PreferenceProfile): string[] {
  const ranked = FEATURES.map((feature) => ({
    feature,
    weight: preference.weights[feature],
    evidence: preference.evidence[feature],
  })).sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  const withEvidence = ranked.filter((row) => row.evidence > 0.05);
  if (withEvidence.length === 0) return ["No choices recorded yet."];

  const lines: string[] = [];
  const strongest = withEvidence[0];
  const second = withEvidence[1];

  if (strongest && second && strongest.feature === "expression" && second.feature === "sharpness") {
    lines.push("Expression is usually more important than maximum sharpness.");
  } else if (strongest) {
    lines.push(
      `${label(strongest.feature)} is ${adjective(strongest.weight)} with ${evidenceLabel(strongest.evidence)} evidence.`,
    );
  }

  for (const row of withEvidence.slice(1, 4)) {
    lines.push(
      `${label(row.feature)} is ${adjective(row.weight)} (${evidenceLabel(row.evidence)} evidence).`,
    );
  }

  return lines;
}

export function recommendInGroup(
  catalog: Catalog,
  groupId: string,
): { assetId: string; confidence: number } | null {
  const group = catalog.groups.find((item) => item.id === groupId);
  if (!group) return null;

  const scored = group.assetIds
    .map((assetId) => {
      const asset = catalog.assets.find((item) => item.id === assetId);
      if (!asset) return null;
      const analysis = catalog.analyses.find(
        (item) => item.versionId === asset.originalVersionId,
      );
      if (!analysis) return null;
      return {
        assetId,
        score: scoreAsset(analysis.qualitySignals, catalog.preference),
      };
    })
    .filter((row): row is { assetId: string; score: number } => row !== null)
    .sort((a, b) => b.score - a.score);

  if (scored.length < 2) return null;
  const lead = scored[0];
  const runner = scored[1];
  const spread = lead.score - runner.score;
  const evidence = FEATURES.reduce(
    (sum, feature) => sum + catalog.preference.evidence[feature],
    0,
  );
  const confidence = Math.min(0.95, Math.max(0.2, 0.35 + spread + evidence / 8));
  return { assetId: lead.assetId, confidence };
}

function label(feature: FeatureName): string {
  switch (feature) {
    case "faceVisibility":
      return "Face visibility";
    default:
      return feature.charAt(0).toUpperCase() + feature.slice(1);
  }
}

function adjective(weight: number): string {
  const magnitude = Math.abs(weight);
  if (magnitude < 0.15) return "weakly weighted";
  if (magnitude < 0.4) return "important";
  return weight > 0 ? "strongly preferred when higher" : "preferred when lower";
}

function evidenceLabel(evidence: number): string {
  if (evidence < 0.2) return "weak";
  if (evidence < 0.6) return "moderate";
  return "strong";
}
