"use client";

import { startTransition, useCallback, useState } from "react";
import { useUploadThing } from "@/adapters/uploadthing/client";
import { useWorkspace } from "@/ui/workspace-provider";

async function readImage(file: File) {
  const src = URL.createObjectURL(file);
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const width = bitmap.width || 1200;
      const height = bitmap.height || 800;
      bitmap.close();
      return { src, width, height };
    } catch {
      /* fall through to HTMLImageElement */
    }
  }
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

  const ingestFiles = useCallback(
    async (files: File[], place = false) => {
      const images = files.filter((file) => file.type.startsWith("image/"));
      if (images.length === 0) {
        const summary = "Those files are not images.";
        setStatus(summary);
        return { ok: false as const, summary };
      }

      const uploadTask = startUpload(images).catch(() => undefined);
      const local = await Promise.all(
        images.map(async (file) => {
          const meta = await readImage(file);
          return { file, ...meta, mimeType: file.type, name: file.name };
        }),
      );

      const result = commands.ingestPhotos({
        files: local.map((item) => ({
          src: item.src,
          name: item.name,
          width: item.width,
          height: item.height,
          mimeType: item.mimeType,
        })),
      });
      const assetIds = Array.isArray(result.data?.assetIds)
        ? (result.data.assetIds as string[])
        : [];
      const placed =
        place && result.ok && assetIds.length > 0
          ? commands.placePhotos({ assetIds, actor: "human" })
          : result;
      startTransition(() => setStatus(placed.summary));

      void uploadTask.then((uploaded) => {
        if (!uploaded || uploaded.length === 0 || assetIds.length === 0) return;
        const items = local.flatMap((item, index) => {
          const match =
            uploaded.find((entry) => entry.name === item.name) ?? uploaded[index];
          const assetId = assetIds[index];
          if (!match || !assetId) return [];
          return [{ assetId, url: match.ufsUrl, key: match.key }];
        });
        if (items.length === 0) return;
        commands.bindRemoteOriginals({ items });
        for (const item of local) URL.revokeObjectURL(item.src);
        startTransition(() => {
          setStatus(`Saved ${items.length} photo(s) to UploadThing.`);
        });
      });

      return placed;
    },
    [commands, startUpload],
  );

  return { ingestFiles, isUploading, status, setStatus };
}
