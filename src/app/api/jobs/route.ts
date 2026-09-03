import { NextResponse } from "next/server";
import { createHuggingFaceProvider } from "@/adapters/huggingface/provider";
import { createLocalPreviewProvider } from "@/adapters/demo-provider/provider";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sourceUrl: string;
    instruction: string;
    maskPng?: string;
    allowDemoFallback?: boolean;
  };

  if (!body.sourceUrl || !body.instruction) {
    return NextResponse.json({ error: "sourceUrl and instruction are required" }, { status: 400 });
  }

  const sourceBytes = await fetchAllowed(body.sourceUrl, request);
  const mime = guessMime(body.sourceUrl);
  const isSvg = mime.includes("svg");
  const hf = !isSvg && process.env.HF_TOKEN ? createHuggingFaceProvider() : null;
  const local = createLocalPreviewProvider();

  try {
    const result = hf
      ? await hf.edit({
          sourceBytes,
          sourceMime: mime,
          instruction: body.instruction,
        })
      : body.allowDemoFallback
        ? await local.edit({
            sourceBytes,
            sourceMime: mime,
            instruction: body.instruction,
          })
        : null;

    if (!result) {
      return NextResponse.json(
        { error: "No image provider configured. Add HF_TOKEN or enable the labeled demo fallback." },
        { status: 400 },
      );
    }

    const b64 = Buffer.from(result.bytes).toString("base64");
    return NextResponse.json({
      outputSrc: `data:${result.mimeType};base64,${b64}`,
      mimeType: result.mimeType,
      provider: result.provider,
      model: result.model,
      labeledDemoFallback: result.labeledDemoFallback ?? false,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image job failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function fetchAllowed(url: string, request: Request): Promise<Uint8Array> {
  if (url.startsWith("data:")) {
    const comma = url.indexOf(",");
    return Uint8Array.from(Buffer.from(url.slice(comma + 1), "base64"));
  }
  if (url.startsWith("/")) {
    const origin = new URL(request.url).origin;
    const res = await fetch(`${origin}${url}`);
    if (!res.ok) throw new Error("Could not read source image.");
    return new Uint8Array(await res.arrayBuffer());
  }
  const allowed = /uploadthing\.com|utfs\.io|ufs\.sh$/i.test(new URL(url).host);
  if (!allowed) throw new Error("Source URL is not an allowed blob host.");
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch source image.");
  return new Uint8Array(await res.arrayBuffer());
}

function guessMime(url: string): string {
  if (url.startsWith("data:")) return url.slice(5, url.indexOf(";")) || "image/png";
  if (url.endsWith(".svg")) return "image/svg+xml";
  if (url.endsWith(".jpg") || url.endsWith(".jpeg")) return "image/jpeg";
  if (url.endsWith(".webp")) return "image/webp";
  return "image/png";
}
