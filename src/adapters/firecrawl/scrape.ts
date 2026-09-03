import type { RelatedTender } from "@/domain/types";

const ALLOW = [
  "data.opencity.in",
  "opencity.in",
  "karnatakatenders.in",
  "www.karnatakatenders.in",
  "www.thenewsminute.com",
  "thenewsminute.com",
];

export function isAllowlisted(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return ALLOW.some((item) => host === item || host.endsWith(`.${item}`));
  } catch {
    return false;
  }
}

export async function scrapeCivicPage(url: string): Promise<Record<string, unknown>> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    return {
      stub: true,
      note: "FIRECRAWL_API_KEY missing. Returning labeled stub JSON.",
      url,
    };
  }

  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      url,
      onlyMainContent: true,
      formats: [
        "markdown",
        {
          type: "json",
          prompt:
            "Extract civic records: tenders, datasets, audits, or named public works in Bengaluru. Prefer stormwater, lakes, UGD, and water supply.",
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    refNo: { type: "string" },
                    title: { type: "string" },
                    sector: { type: "string" },
                    valueText: { type: "string" },
                    location: { type: "string" },
                    closingDate: { type: "string" },
                    detailUrl: { type: "string" },
                    matchedCategory: { type: "string" },
                  },
                },
              },
            },
          },
        },
      ],
    }),
  });

  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    return { error: "Firecrawl scrape failed", status: response.status, payload };
  }

  const data = (payload.data as Record<string, unknown> | undefined) ?? payload;
  return {
    url,
    markdown: data.markdown,
    json: data.json,
    metadata: data.metadata,
  };
}

export function itemsFromScrape(data: Record<string, unknown>): RelatedTender[] {
  const json = data.json as { items?: Array<Record<string, unknown>> } | undefined;
  const items = json?.items;
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => typeof item.title === "string" && item.title.length > 0)
    .map((item) => ({
      refNo: String(item.refNo ?? item.title),
      title: String(item.title),
      sector: String(item.sector ?? "Civic"),
      valueText: String(item.valueText ?? "see source"),
      location: String(item.location ?? "Bengaluru"),
      closingDate: String(item.closingDate ?? "see source"),
      detailUrl: String(item.detailUrl ?? data.url ?? ""),
      matchedCategory: matchCategory(item.matchedCategory ?? item.sector ?? item.title),
    }));
}

function matchCategory(value: unknown): RelatedTender["matchedCategory"] {
  const hay = String(value).toLowerCase();
  if (hay.includes("flood") || hay.includes("storm") || hay.includes("drain") || hay.includes("swd")) {
    return "flooding";
  }
  if (hay.includes("lake")) return "lakes";
  if (hay.includes("water") || hay.includes("cauvery") || hay.includes("tanker")) return "water";
  if (hay.includes("ugd") || hay.includes("trench") || hay.includes("works")) return "works";
  return "none";
}
