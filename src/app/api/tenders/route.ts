import { NextResponse } from "next/server";
import bundled from "../../../../public/data/tenders-sample.json";
import { itemsFromScrape, scrapeCivicPage } from "@/adapters/firecrawl/scrape";
import type { RelatedTender } from "@/domain/types";

const LIVE_URLS = [
  "https://data.opencity.in/dataset?q=bengaluru+stormwater",
  "https://data.opencity.in/dataset?q=bellandur+lake",
];

let cache: { at: number; tenders: RelatedTender[]; source: string } | null = null;

export async function GET() {
  const seed = bundled as RelatedTender[];
  if (!process.env.FIRECRAWL_API_KEY) {
    return NextResponse.json({ source: "bundled", live: false, tenders: seed });
  }
  if (cache && Date.now() - cache.at < 60 * 60 * 1000) {
    return NextResponse.json({ source: cache.source, live: true, tenders: cache.tenders });
  }

  const extras: RelatedTender[] = [];
  for (const url of LIVE_URLS) {
    const scraped = await scrapeCivicPage(url);
    extras.push(...itemsFromScrape(scraped));
  }

  const byRef = new Map<string, RelatedTender>();
  for (const row of [...seed, ...extras]) byRef.set(row.refNo, row);
  const tenders = [...byRef.values()];
  cache = { at: Date.now(), tenders, source: extras.length ? "live" : "bundled" };
  return NextResponse.json({ source: cache.source, live: extras.length > 0, tenders });
}
