import type { VoiceCategory } from "@/domain/categories";
import type { RelatedTender } from "@/domain/types";
import sample from "../../../public/data/tenders-sample.json";

const SEED = sample as RelatedTender[];

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

  return SEED.filter((tender) => {
    if (input.category && tender.matchedCategory !== input.category) return false;
    if (needles.length === 0) return true;
    const blob = hay(tender);
    return needles.some((needle) => blob.includes(needle) || needle.split(/\s+/).some((part) => part.length > 3 && blob.includes(part)));
  });
}

export function allTenders(): RelatedTender[] {
  return SEED;
}
