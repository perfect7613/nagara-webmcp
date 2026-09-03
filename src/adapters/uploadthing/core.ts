import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  originals: f({
    image: { maxFileSize: "16MB", maxFileCount: 24 },
  })
    .middleware(async () => ({ kind: "original" as const }))
    .onUploadComplete(async ({ file }) => ({
      key: file.key,
      url: file.ufsUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    })),
  derivatives: f({
    image: { maxFileSize: "16MB", maxFileCount: 8 },
  })
    .middleware(async () => ({ kind: "derivative" as const }))
    .onUploadComplete(async ({ file }) => ({
      key: file.key,
      url: file.ufsUrl,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
