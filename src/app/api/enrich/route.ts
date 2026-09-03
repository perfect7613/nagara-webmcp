import { NextRequest, NextResponse } from "next/server";

const ALLOW = ["data.opencity.in", "karnatakatenders.in", "www.karnatakatenders.in"];

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { url?: string };
  const url = body.url ?? "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!ALLOW.some((item) => host === item || host.endsWith(`.${item}`))) {
    return NextResponse.json({ error: "Host not allowlisted" }, { status: 400 });
  }

  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) {
    return NextResponse.json({
      stub: true,
      note: "FIRECRAWL_API_KEY missing — returning labeled stub JSON.",
      url,
      items: [
        {
          refNo: "STUB/SWD/HSR/001",
          title: "Desilting of stormwater drains — HSR toward Bellandur (stub)",
          sector: "Stormwater",
          matchedCategory: "flooding",
        },
      ],
    });
  }

  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: [
        {
          type: "json",
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
                  },
                },
              },
            },
          },
        },
      ],
    }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.ok ? 200 : 502 });
}
