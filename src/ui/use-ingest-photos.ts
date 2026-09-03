"use client";

import { useState } from "react";
import { useUploadThing } from "@/adapters/uploadthing/client";
import { useWorkspace } from "@/ui/workspace-provider";

function readImage(file: File) {
  const src = URL.createObjectURL(file);
  return new Promise<{ src: string; width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ src, width: image.naturalWidth || 1200, height: image.naturalHeight || 800 });
    image.onerror = () => reject(new Error(`Could not read ${file.name}`));
    image.src = src;
  });
}

export function useIngestPhotos() {
  const { commands } = useWorkspace();
  const [status, setStatus] = useState<string | null>(null);
  const { startUpload, isUploading } = useUploadThing("originals", {
    onUploadError() {
      setStatus("UploadThing failed — keeping files locally.");
    },
  });

  async function ingestFiles(files: File[], place = false) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      setStatus("Those files are not images.");
      return { ok: false as const, summary: "Those files are not images." };
    }
    setStatus(isUploading ? "Uploading…" : "Reading photos…");
    const local = await Promise.all(
      images.map(async (file) => {
        const meta = await readImage(file);
        return { file, ...meta, mimeType: file.type, name: file.name };
      }),
    );
    let remote: Array<{ url: string; key: string; name: string }> = [];
    try {
      const uploaded = await startUpload(images);
      remote =
        uploaded?.map((item) => ({
          url: item.ufsUrl,
          key: item.key,
          name: item.name,
        })) ?? [];
    } catch {
      remote = [];
    }
    const result = commands.ingestPhotos({
      files: local.map((item) => {
        const match = remote.find((entry) => entry.name === item.name);
        if (match) URL.revokeObjectURL(item.src);
        return {
          src: match?.url ?? item.src,
          name: item.name,
          width: item.width,
          height: item.height,
          mimeType: item.mimeType,
          blobKey: match?.key,
        };
      }),
    });
    setStatus(result.summary);
    if (place && result.ok) {
      const assetIds = Array.isArray(result.data?.assetIds)
        ? (result.data.assetIds as string[])
        : [];
      if (assetIds.length > 0) {
        const placed = commands.placePhotos({ assetIds, actor: "human" });
        setStatus(placed.summary);
        return placed;
      }
    }
    return result;
  }

  return { ingestFiles, isUploading, status, setStatus };
}
