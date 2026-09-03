import type { VoiceCategory } from "@/domain/categories";
import type { RelatedTender } from "@/domain/types";
import sample from "../../../public/data/tenders-sample.json";

const bundled = sample as RelatedTender[];
let extra: RelatedTender[] = [];

function catalog(): RelatedTender[] {
  const byRef = new Map<string, RelatedTender>();
  for (const row of [...bundled, ...extra]) byRef.set(row.refNo, row);
  return [...byRef.values()];
}

export function hydrateTenders(rows: RelatedTender[]) {
  extra = rows;
}

function hay(tender: RelatedTender): string {
  return `${tender.title} ${tender.location} ${tender.sector} ${tender.matchedCategory}`.toLowerCase();
}

export function listRelatedTenders(input: {
  areaName?: string;
  wardId?: string;
  category?: VoiceCategory | null;
  query?: string;
}): RelatedTender[] {
  const needles = [input.areaName, input.wardId, input.query]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.toLowerCase());

  return catalog().filter((tender) => {
    if (input.category && tender.matchedCategory !== input.category && tender.matchedCategory !== "none") {
      return false;
    }
    if (needles.length === 0) return true;
    const blob = hay(tender);
    return needles.some(
      (needle) => blob.includes(needle) || needle.split(/\s+/).some((part) => part.length > 3 && blob.includes(part)),
    );
  });
}

export function allTenders(): RelatedTender[] {
  return catalog();
}
