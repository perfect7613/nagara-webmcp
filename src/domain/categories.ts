export const CATEGORIES = [
  "flooding",
  "water",
  "lakes",
  "works",
  "encroach",
  "footpaths",
  "lights",
  "waste",
  "other",
] as const;

export type VoiceCategory = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<VoiceCategory, string> = {
  flooding: "Flooding",
  water: "Water",
  lakes: "Lakes",
  works: "Works",
  encroach: "Encroach",
  footpaths: "Footpaths",
  lights: "Lights",
  waste: "Waste",
  other: "Other",
};

export const LANDING_CATEGORIES: VoiceCategory[] = [
  "flooding",
  "water",
  "lakes",
  "works",
];

export const CATEGORY_TONE: Record<VoiceCategory, string> = {
  flooding: "#0B6E99",
  water: "#1D4ED8",
  lakes: "#047857",
  works: "#B45309",
  encroach: "#7C3AED",
  footpaths: "#0F766E",
  lights: "#CA8A04",
  waste: "#EC324E",
  other: "#6B7280",
};
