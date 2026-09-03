import { NextRequest, NextResponse } from "next/server";
import { isAllowlisted, scrapeCivicPage } from "@/adapters/firecrawl/scrape";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { url?: string };
  const url = body.url ?? "";
  if (!isAllowlisted(url)) {
    return NextResponse.json({ error: "Host not allowlisted" }, { status: 400 });
  }
  const data = await scrapeCivicPage(url);
  const failed = "error" in data;
  return NextResponse.json(data, { status: failed ? 502 : 200 });
}
