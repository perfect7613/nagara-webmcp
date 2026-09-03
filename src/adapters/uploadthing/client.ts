import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/adapters/uploadthing/core";

export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
