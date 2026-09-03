import { CATEGORIES, type VoiceCategory } from "@/domain/categories";

const RULES: Array<{ category: VoiceCategory; needles: string[] }> = [
  {
    category: "flooding",
    needles: [
      "flood",
      "waterlog",
      "stormwater",
      "swd",
      "drain",
      "inundat",
      "overflow",
      "stagnant rain",
    ],
  },
  {
    category: "lakes",
    needles: ["lake", "foam", "bellandur", "varthur", "bund", "kaikondrahalli", "soulkere"],
  },
  {
    category: "water",
    needles: ["tanker", "borewell", "cauvery", "water cut", "no water", "supply"],
  },
  {
    category: "works",
    needles: ["trench", "ugd", "white-top", "whitetop", "dug up", "unrestored", "tender"],
  },
  {
    category: "encroach",
    needles: ["encroach", "ca site", "buffer", "illegal structure"],
  },
  {
    category: "footpaths",
    needles: ["footpath", "sidewalk", "pavement", "walkway"],
  },
  {
    category: "lights",
    needles: ["streetlight", "street light", "dark junction", "lamp"],
  },
  {
    category: "waste",
    needles: ["garbage", "blackspot", "dump", "uncollected", "burning waste"],
  },
];

export function classifyIssue(text: string): {
  category: VoiceCategory | null;
  confidence: number;
  reason: string;
} {
  const hay = text.toLowerCase();
  if (!hay.trim()) {
    return { category: null, confidence: 0, reason: "Pick a category chip. Nothing to classify yet." };
  }

  for (const rule of RULES) {
    const hit = rule.needles.find((needle) => hay.includes(needle));
    if (hit) {
      return {
        category: rule.category,
        confidence: 0.82,
        reason: `Matched "${hit}" to ${rule.category}.`,
      };
    }
  }

  return {
    category: null,
    confidence: 0,
    reason: "Unclear. Ask the human to pick a chip. Do not default to waste or roads.",
  };
}

export function isCategory(value: unknown): value is VoiceCategory {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
