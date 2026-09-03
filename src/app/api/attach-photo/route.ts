import { NextRequest, NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

export async function POST(request: NextRequest) {
  if (!process.env.UPLOADTHING_TOKEN) {
    return NextResponse.json({ error: "UPLOADTHING_TOKEN missing" }, { status: 503 });
  }

  const body = (await request.json()) as { photoUrl?: string; name?: string };
  const photoUrl = body.photoUrl?.trim();
  if (!photoUrl || !/^https?:\/\//i.test(photoUrl)) {
    return NextResponse.json({ error: "photoUrl must be an http(s) image URL" }, { status: 400 });
  }

  const utapi = new UTApi();
  const uploaded = await utapi.uploadFilesFromUrl(photoUrl);
  const file = (Array.isArray(uploaded) ? uploaded[0] : uploaded) as {
    data?: { ufsUrl?: string; name?: string; key?: string };
    error?: { message?: string };
    right?: { ufsUrl?: string; name?: string; key?: string };
  };
  const data = file?.data ?? file?.right;
  if (!data?.ufsUrl) {
    return NextResponse.json(
      { error: file?.error?.message ?? "Upload failed", photoUrl },
      { status: 502 },
    );
  }

  return NextResponse.json({
    photoUrl: data.ufsUrl,
    name: body.name ?? data.name,
    key: data.key,
  });
}
