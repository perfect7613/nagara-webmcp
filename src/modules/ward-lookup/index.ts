import type { WardHit } from "@/domain/types";
import { WARDS } from "@/modules/ward-lookup/wards";

function scoreName(query: string, ward: (typeof WARDS)[number]): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  if (ward.name.toLowerCase() === q) return 1;
  if (ward.aliases.some((alias) => alias === q)) return 0.96;
  if (ward.name.toLowerCase().includes(q) || q.includes(ward.name.toLowerCase())) return 0.84;
  if (ward.aliases.some((alias) => alias.includes(q) || q.includes(alias))) return 0.78;
  return 0;
}

export function fromAreaName(query: string): WardHit | null {
  let best: WardHit | null = null;
  for (const ward of WARDS) {
    const confidence = scoreName(query, ward);
    if (confidence > (best?.confidence ?? 0.45)) {
      best = { ...ward, confidence };
    }
  }
  return best;
}

export function fromPoint(lng: number, lat: number): WardHit | null {
  const inside = WARDS.find(
    (ward) => lng >= ward.bbox[0] && lat >= ward.bbox[1] && lng <= ward.bbox[2] && lat <= ward.bbox[3],
  );
  if (inside) return { ...inside, confidence: 0.9 };

  let nearest = WARDS[0];
  let dist = Number.POSITIVE_INFINITY;
  for (const ward of WARDS) {
    const d = (ward.lng - lng) ** 2 + (ward.lat - lat) ** 2;
    if (d < dist) {
      dist = d;
      nearest = ward;
    }
  }
  return { ...nearest, confidence: 0.55 };
}

export function nearbyAliases(ward: WardHit | null): string[] {
  if (!ward) return WARDS.slice(0, 4).map((item) => item.name);
  return WARDS.filter((item) => item.id !== ward.id)
    .slice(0, 3)
    .map((item) => item.name);
}
